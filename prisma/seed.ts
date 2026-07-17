import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { PrismaLibSql } from '@prisma/adapter-libsql';

import { findRepoRoot } from '../apps/api/src/infrastructure/config/repo-root';
import { PrismaClient } from '../apps/api/src/infrastructure/database/generated/client';

const repoRoot = findRepoRoot(__dirname);
const rootEnvPath = join(repoRoot, '.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

function resolveDatabaseUrl(rawUrl: string): string {
  if (!rawUrl.startsWith('file:')) {
    return rawUrl;
  }
  const relativePath = rawUrl.slice('file:'.length);
  return isAbsolute(relativePath) ? rawUrl : `file:${resolve(repoRoot, relativePath)}`;
}

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL est requis pour lancer le seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: resolveDatabaseUrl(databaseUrl),
    authToken: process.env['TURSO_AUTH_TOKEN'],
  }),
});

interface SeedCar {
  slug: string;
  manufacturer: string;
  name: string;
}

interface SeedCategory {
  name: string;
  cars: SeedCar[];
}

interface SeedGame {
  slug: string;
  name: string;
  supportedExtensions: string[];
  categories: SeedCategory[];
}

interface SeedTrack {
  slug: string;
  name: string;
  layout: string | null;
  countryCode: string;
}

const games: SeedGame[] = [
  {
    slug: 'iracing',
    name: 'iRacing',
    supportedExtensions: ['.sto'],
    categories: [
      {
        name: 'GT3',
        cars: [
          { slug: 'ferrari-296-gt3', manufacturer: 'Ferrari', name: '296 GT3' },
          { slug: 'bmw-m4-gt3', manufacturer: 'BMW', name: 'M4 GT3' },
          { slug: 'mercedes-amg-gt3-evo', manufacturer: 'Mercedes-AMG', name: 'GT3 Evo' },
          { slug: 'porsche-911-gt3-r-992', manufacturer: 'Porsche', name: '911 GT3 R (992)' },
        ],
      },
      {
        name: 'Prototype',
        cars: [
          { slug: 'cadillac-v-series-r', manufacturer: 'Cadillac', name: 'V-Series.R' },
          { slug: 'porsche-963', manufacturer: 'Porsche', name: '963' },
          { slug: 'bmw-m-hybrid-v8', manufacturer: 'BMW', name: 'M Hybrid V8' },
        ],
      },
      {
        name: 'Formula',
        cars: [
          { slug: 'dallara-ir18', manufacturer: 'Dallara', name: 'IR-18 (IndyCar)' },
          { slug: 'formula-renault-35', manufacturer: 'Renault', name: 'Formula Renault 3.5' },
        ],
      },
      {
        name: 'Oval',
        cars: [
          { slug: 'nascar-next-gen-chevrolet', manufacturer: 'Chevrolet', name: 'Next Gen Camaro' },
          { slug: 'nascar-next-gen-ford', manufacturer: 'Ford', name: 'Next Gen Mustang' },
          { slug: 'nascar-next-gen-toyota', manufacturer: 'Toyota', name: 'Next Gen Camry' },
        ],
      },
    ],
  },
  {
    slug: 'acc',
    name: 'Assetto Corsa Competizione',
    supportedExtensions: ['.json'],
    categories: [
      {
        name: 'GT3',
        cars: [
          { slug: 'ferrari-296-gt3', manufacturer: 'Ferrari', name: '296 GT3' },
          {
            slug: 'lamborghini-huracan-gt3-evo2',
            manufacturer: 'Lamborghini',
            name: 'Huracán GT3 Evo2',
          },
          { slug: 'audi-r8-lms-gt3-evo2', manufacturer: 'Audi', name: 'R8 LMS GT3 Evo II' },
          { slug: 'mclaren-720s-gt3-evo', manufacturer: 'McLaren', name: '720S GT3 Evo' },
          { slug: 'porsche-911-gt3-r-992', manufacturer: 'Porsche', name: '911 GT3 R (992)' },
        ],
      },
      {
        name: 'GT4',
        cars: [
          { slug: 'porsche-718-cayman-gt4', manufacturer: 'Porsche', name: '718 Cayman GT4' },
          { slug: 'alpine-a110-gt4', manufacturer: 'Alpine', name: 'A110 GT4' },
          { slug: 'ktm-xbow-gt4', manufacturer: 'KTM', name: 'X-Bow GT4' },
        ],
      },
      {
        name: 'GT2',
        cars: [
          {
            slug: 'porsche-911-gt2-rs-clubsport',
            manufacturer: 'Porsche',
            name: '911 GT2 RS CS Evo',
          },
          { slug: 'audi-rs3-lms-gt2', manufacturer: 'Audi', name: 'RS 3 LMS GT2' },
        ],
      },
    ],
  },
  {
    slug: 'ams2',
    name: 'Automobilista 2',
    supportedExtensions: ['.vsu'],
    categories: [
      {
        name: 'GT3',
        cars: [
          { slug: 'mclaren-720s-gt3', manufacturer: 'McLaren', name: '720S GT3' },
          { slug: 'ferrari-488-gt3-evo', manufacturer: 'Ferrari', name: '488 GT3 Evo' },
          { slug: 'aston-martin-vantage-gt3', manufacturer: 'Aston Martin', name: 'Vantage GT3' },
        ],
      },
      {
        name: 'Stock Car',
        cars: [
          {
            slug: 'stock-car-chevrolet-camaro',
            manufacturer: 'Chevrolet',
            name: 'Camaro Stock Car',
          },
          { slug: 'stock-car-toyota-corolla', manufacturer: 'Toyota', name: 'Corolla Stock Car' },
        ],
      },
      {
        name: 'Formula Vee',
        cars: [{ slug: 'formula-vee', manufacturer: 'Volkswagen', name: 'Formula Vee' }],
      },
    ],
  },
  {
    slug: 'rfactor2',
    name: 'rFactor 2',
    supportedExtensions: ['.svm'],
    categories: [
      {
        name: 'GT3',
        cars: [
          { slug: 'bmw-m4-gt3', manufacturer: 'BMW', name: 'M4 GT3' },
          { slug: 'audi-r8-lms-evo2', manufacturer: 'Audi', name: 'R8 LMS Evo II' },
          { slug: 'ferrari-296-gt3', manufacturer: 'Ferrari', name: '296 GT3' },
        ],
      },
      {
        name: 'Formula',
        cars: [
          { slug: 'formula-pro', manufacturer: 'Generic', name: 'Formula Pro' },
          { slug: 'formula-2', manufacturer: 'Dallara', name: 'Formula 2' },
        ],
      },
    ],
  },
];

const tracks: SeedTrack[] = [
  { slug: 'spa-francorchamps', name: 'Spa-Francorchamps', layout: 'Grand Prix', countryCode: 'BE' },
  { slug: 'nurburgring-gp', name: 'Nürburgring', layout: 'Grand Prix', countryCode: 'DE' },
  {
    slug: 'nurburgring-nordschleife',
    name: 'Nürburgring',
    layout: 'Nordschleife',
    countryCode: 'DE',
  },
  { slug: 'monza', name: 'Monza', layout: 'Grand Prix', countryCode: 'IT' },
  { slug: 'silverstone-gp', name: 'Silverstone', layout: 'Grand Prix', countryCode: 'GB' },
  { slug: 'silverstone-national', name: 'Silverstone', layout: 'National', countryCode: 'GB' },
  { slug: 'suzuka', name: 'Suzuka', layout: null, countryCode: 'JP' },
  { slug: 'watkins-glen', name: 'Watkins Glen', layout: 'Grand Prix', countryCode: 'US' },
  { slug: 'road-america', name: 'Road America', layout: null, countryCode: 'US' },
  { slug: 'mount-panorama', name: 'Mount Panorama (Bathurst)', layout: null, countryCode: 'AU' },
  { slug: 'laguna-seca', name: 'WeatherTech Raceway Laguna Seca', layout: null, countryCode: 'US' },
  { slug: 'brands-hatch-gp', name: 'Brands Hatch', layout: 'Grand Prix', countryCode: 'GB' },
  { slug: 'brands-hatch-indy', name: 'Brands Hatch', layout: 'Indy', countryCode: 'GB' },
  { slug: 'imola', name: 'Imola', layout: null, countryCode: 'IT' },
  {
    slug: 'barcelona-catalunya',
    name: 'Circuit de Barcelona-Catalunya',
    layout: null,
    countryCode: 'ES',
  },
  { slug: 'zandvoort', name: 'Zandvoort', layout: null, countryCode: 'NL' },
  { slug: 'interlagos', name: 'Interlagos', layout: null, countryCode: 'BR' },
  {
    slug: 'daytona-road-course',
    name: 'Daytona International Speedway',
    layout: 'Road Course',
    countryCode: 'US',
  },
  { slug: 'le-mans', name: 'Circuit des 24 Heures du Mans', layout: null, countryCode: 'FR' },
  { slug: 'paul-ricard', name: 'Circuit Paul Ricard', layout: null, countryCode: 'FR' },
];

async function main(): Promise<void> {
  for (const game of games) {
    const gameRow = await prisma.game.upsert({
      where: { slug: game.slug },
      create: {
        slug: game.slug,
        name: game.name,
        supportedExtensions: JSON.stringify(game.supportedExtensions),
      },
      update: {
        name: game.name,
        supportedExtensions: JSON.stringify(game.supportedExtensions),
      },
    });

    for (const category of game.categories) {
      const categoryRow = await prisma.carCategory.upsert({
        where: { gameId_name: { gameId: gameRow.id, name: category.name } },
        create: { gameId: gameRow.id, name: category.name },
        update: {},
      });

      for (const car of category.cars) {
        await prisma.car.upsert({
          where: { gameId_slug: { gameId: gameRow.id, slug: car.slug } },
          create: {
            gameId: gameRow.id,
            categoryId: categoryRow.id,
            slug: car.slug,
            manufacturer: car.manufacturer,
            name: car.name,
          },
          update: {
            categoryId: categoryRow.id,
            manufacturer: car.manufacturer,
            name: car.name,
          },
        });
      }
    }
  }

  for (const track of tracks) {
    await prisma.track.upsert({
      where: { slug: track.slug },
      create: track,
      update: track,
    });
  }

  const [gameCount, categoryCount, carCount, trackCount] = await Promise.all([
    prisma.game.count(),
    prisma.carCategory.count(),
    prisma.car.count(),
    prisma.track.count(),
  ]);

  console.log(
    `Seed terminé : ${gameCount} jeux, ${categoryCount} catégories, ${carCount} voitures, ${trackCount} circuits.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
