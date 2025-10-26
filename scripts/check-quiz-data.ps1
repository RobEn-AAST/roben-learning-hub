# Quick Database Status Check
# This script checks if quiz data exists in your database

Write-Host ""
Write-Host "Checking Quiz Data in Database..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""

# Check if Supabase CLI is installed
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseExists) {
    Write-Host "ERROR: Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install options:" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase" -ForegroundColor White
    Write-Host "   OR" -ForegroundColor Gray
    Write-Host "   scoop install supabase" -ForegroundColor White
    Write-Host ""
    
    # Offer alternative: Open Supabase Dashboard
    Write-Host "Alternative: Check manually in Supabase Dashboard" -ForegroundColor Cyan
    Write-Host "   1. Go to your Supabase project" -ForegroundColor White
    Write-Host "   2. Click 'Table Editor'" -ForegroundColor White
    Write-Host "   3. Check the 'quizzes' table" -ForegroundColor White
    Write-Host ""
    
    exit 1
}

# Count quizzes
Write-Host "Checking Tables..." -ForegroundColor Yellow
Write-Host ""

$countQuery = "SELECT (SELECT COUNT(*) FROM quizzes) as total_quizzes, (SELECT COUNT(*) FROM questions) as total_questions, (SELECT COUNT(*) FROM question_options) as total_options;"

Write-Host "Running query..." -ForegroundColor Gray
$result = $countQuery | supabase db query 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $result
    Write-Host ""
    
    # Parse the result to determine if data exists
    if ($result -match "0.*0.*0") {
        Write-Host "ERROR: DATABASE IS EMPTY - No quiz data found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "To fix this issue:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Option 1 - Reseed everything:" -ForegroundColor White
        Write-Host "   .\scripts\reseed-database.ps1" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Option 2 - Use Supabase CLI:" -ForegroundColor White
        Write-Host "   supabase db reset" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Option 3 - Manual SQL (in Supabase Dashboard):" -ForegroundColor White
        Write-Host "   Run the SQL from: scripts\reseed-quiz-data.sql" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "SUCCESS: Quiz data exists in database!" -ForegroundColor Green
        Write-Host ""
        Write-Host "If quizzes still don't show in your app:" -ForegroundColor Yellow
        Write-Host "   1. Hard refresh your browser (Ctrl + Shift + R)" -ForegroundColor White
        Write-Host "   2. Check browser console for errors (F12)" -ForegroundColor White
        Write-Host "   3. Verify your .env.local has SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
        Write-Host ""
        
        # Show detailed breakdown
        Write-Host "Detailed Breakdown:" -ForegroundColor Cyan
        $detailedQuery = "SELECT l.title as lesson_name, l.lesson_type, q.title as quiz_title, COUNT(DISTINCT ques.id) as num_questions, COUNT(qo.id) as num_options FROM lessons l LEFT JOIN quizzes q ON q.lesson_id = l.id LEFT JOIN questions ques ON ques.quiz_id = q.id LEFT JOIN question_options qo ON qo.question_id = ques.id WHERE l.lesson_type = 'quiz' GROUP BY l.title, l.lesson_type, q.title ORDER BY l.title;"
        Write-Host ""
        $detailedQuery | supabase db query
    }
} else {
    Write-Host "ERROR: Error connecting to database" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Supabase is linked:" -ForegroundColor Yellow
    Write-Host "   supabase link" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""
