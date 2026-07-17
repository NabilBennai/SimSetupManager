import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PrepareUploadResponse, PublicFileObject } from '@sim-setup-manager/contracts';
import type { Request, Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { getRequestId } from '../../common/http/get-request-id';
import type { User } from '../../infrastructure/database/generated/client';
import { LocalDiskStorageProvider } from '../../infrastructure/storage/local-disk-storage.provider';
import { PrepareUploadDto } from './dto/prepare-upload.dto';
import { maxUploadSizeBytes, UploadsService } from './uploads.service';

function sendError(res: Response, status: number, code: string, message: string): void {
  res
    .status(status)
    .json({ error: { code, message, details: [] }, meta: { requestId: getRequestId(res) } });
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly localStorage: LocalDiskStorageProvider,
  ) {}

  @Post('prepare')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Valide un fichier candidat et prépare une intention d'upload." })
  prepare(
    @CurrentUser() user: User,
    @Body() dto: PrepareUploadDto,
  ): Promise<PrepareUploadResponse> {
    return this.uploadsService.prepare(user.id, dto);
  }

  /**
   * Pas de SessionAuthGuard : l'autorisation vient du jeton signé (capacité
   * à courte durée), pas de la session — c'est la route qui, avec un vrai
   * fournisseur cloud, n'existerait pas sur notre API (le navigateur
   * enverrait directement au stockage).
   */
  @Put('blob/:storageKey')
  async uploadBlob(
    @Param('storageKey') storageKey: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!token || !this.localStorage.verifyTokenForKey(token, storageKey)) {
      sendError(res, 403, 'FORBIDDEN', 'Jeton invalide ou expiré.');
      return;
    }

    try {
      await this.uploadsService.assertPendingIntent(storageKey);
    } catch {
      sendError(res, 404, 'NOT_FOUND', "Intention d'upload introuvable ou expirée.");
      return;
    }

    const maxBytes = maxUploadSizeBytes();
    const writeStream = this.localStorage.writeStream(storageKey);
    let received = 0;
    let aborted = false;

    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > maxBytes && !aborted) {
        aborted = true;
        writeStream.destroy();
        req.destroy();
        sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Fichier trop volumineux.');
      }
    });

    writeStream.on('finish', () => {
      if (aborted) {
        return;
      }
      this.uploadsService
        .markUploaded(storageKey)
        .then(() => res.status(204).send())
        .catch(() =>
          sendError(res, 500, 'INTERNAL_SERVER_ERROR', "Échec de la confirmation d'écriture."),
        );
    });

    writeStream.on('error', () => {
      if (!res.headersSent) {
        sendError(res, 500, 'INTERNAL_SERVER_ERROR', "Échec de l'écriture du fichier.");
      }
    });

    req.pipe(writeStream);
  }

  @Post(':uploadId/complete')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Confirme un upload (idempotent) et crée le fichier validé.' })
  complete(
    @CurrentUser() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<PublicFileObject> {
    return this.uploadsService.complete(user.id, uploadId);
  }

  /** Pas de SessionAuthGuard, même raison que uploadBlob : capacité par jeton signé. */
  @Get('download/:storageKey')
  downloadBlob(
    @Param('storageKey') storageKey: string,
    @Query('token') token: string | undefined,
    @Query('filename') filename: string | undefined,
    @Res() res: Response,
  ): void {
    if (!token || !this.localStorage.verifyTokenForKey(token, storageKey)) {
      sendError(res, 403, 'FORBIDDEN', 'Jeton invalide ou expiré.');
      return;
    }

    const stream = this.localStorage.readStream(storageKey);
    stream.on('error', () => {
      if (!res.headersSent) {
        sendError(res, 404, 'NOT_FOUND', 'Fichier introuvable.');
      }
    });

    const safeFilename = filename ? decodeURIComponent(filename).replace(/"/g, '') : storageKey;
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  }
}
