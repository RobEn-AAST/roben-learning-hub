# Quick Fix - Reseed Database with Quiz Data
# This script resets the entire database using the seed.sql file

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Database Reset & Reseed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseExists) {
    Write-Host "ERROR: Supabase CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "OR install with scoop:" -ForegroundColor Yellow
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "WARNING: This will reset your database!" -ForegroundColor Yellow
Write-Host "All existing data will be deleted and replaced with seed data." -ForegroundColor Yellow
Write-Host ""
Write-Host "This includes:" -ForegroundColor White
Write-Host "  - Courses" -ForegroundColor Gray
Write-Host "  - Modules" -ForegroundColor Gray
Write-Host "  - Lessons" -ForegroundColor Gray
Write-Host "  - Quizzes (2 quizzes with 4 questions each)" -ForegroundColor Gray
Write-Host "  - Videos" -ForegroundColor Gray
Write-Host "  - Articles" -ForegroundColor Gray
Write-Host "  - Projects" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Type 'YES' to continue (case-sensitive)"

if ($confirmation -eq "YES") {
    Write-Host ""
    Write-Host "Resetting database..." -ForegroundColor Cyan
    
    # Run supabase db reset
    supabase db reset
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCCESS!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database has been reset and reseeded!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Refresh your browser (Ctrl + Shift + R)" -ForegroundColor White
        Write-Host "  2. Navigate to a quiz lesson" -ForegroundColor White
        Write-Host "  3. Quiz questions should now load dynamically!" -ForegroundColor White
        Write-Host ""
        Write-Host "Available quizzes:" -ForegroundColor Cyan
        Write-Host "  - Frontend Quiz (4 questions)" -ForegroundColor White
        Write-Host "  - Backend Quiz (4 questions)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Failed to reset database!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Make sure you're linked to a Supabase project:" -ForegroundColor White
        Write-Host "     supabase link" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  2. Make sure you're in the project directory" -ForegroundColor White
        Write-Host ""
        Write-Host "  3. Check if Supabase is running locally:" -ForegroundColor White
        Write-Host "     supabase status" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    Write-Host "No changes were made to the database." -ForegroundColor Gray
    Write-Host ""
}
