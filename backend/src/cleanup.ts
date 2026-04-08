import prisma from './prisma';

async function main() {
  const result = await prisma.movie.deleteMany();
  console.log('Deleted:', result);
}

main()
  .catch(console.error)
  .finally(() => prisma['$disconnect']());
