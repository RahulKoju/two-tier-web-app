#!/bin/bash

echo "Waiting for database to be ready..."

until pg_isready -h db -p 5432; do
    echo "DB not ready yet. Retrying in 2s..."
    sleep 2
done

echo "DB is ready"
echo "Running migrations..."
npx prisma migrate deploy 
echo "Migrations applied"
echo "Starting Next.js..."
exec pnpm start