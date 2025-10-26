# Script to reseed the database with quiz data
# This uses Supabase CLI to run the seed.sql file

Write-Host "Reseeding Database with Quiz Data..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseExists) {
    Write-Host "ERROR: Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Please install it: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "Or use scoop: scoop install supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "SUCCESS: Supabase CLI found" -ForegroundColor Green

# Ask user which option they want
Write-Host ""
Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host "1. Reseed ALL data (courses, modules, lessons, quizzes, questions)" -ForegroundColor White
Write-Host "2. Reseed ONLY quiz data (Frontend Quiz)" -ForegroundColor White
Write-Host "3. Check database status (view quiz data)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter your choice (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "WARNING: This will DELETE all existing data and reseed everything!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure? (yes/no)"
        
        if ($confirm -eq "yes") {
            Write-Host ""
            Write-Host "Running full seed script..." -ForegroundColor Cyan
            
            # Run the seed file
            supabase db reset
            
            Write-Host ""
            Write-Host "SUCCESS: Database reseeded successfully!" -ForegroundColor Green
            Write-Host "Your quiz data should now be available in the application." -ForegroundColor Green
        } else {
            Write-Host "Operation cancelled" -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "Reseeding quiz data..." -ForegroundColor Cyan
        
        # Execute the quiz-specific seed script
        Get-Content ".\scripts\reseed-quiz-data.sql" | supabase db query
        
        Write-Host ""
        Write-Host "SUCCESS: Quiz data reseeded successfully!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        Write-Host "Checking database status..." -ForegroundColor Cyan
        Write-Host ""
        
        # Query to check quiz data
        $checkQuery = "SELECT c.title as course_name, m.title as module_name, l.title as lesson_name, q.title as quiz_title, q.passing_score, q.time_limit_minutes, COUNT(DISTINCT ques.id) as total_questions, COUNT(qo.id) as total_options FROM courses c JOIN modules m ON m.course_id = c.id JOIN lessons l ON l.module_id = m.id LEFT JOIN quizzes q ON q.lesson_id = l.id LEFT JOIN questions ques ON ques.quiz_id = q.id LEFT JOIN question_options qo ON qo.question_id = ques.id WHERE l.lesson_type = 'quiz' GROUP BY c.title, m.title, l.title, q.title, q.passing_score, q.time_limit_minutes ORDER BY c.title, m.title, l.position;"
        
        $checkQuery | supabase db query
        
        Write-Host ""
        Write-Host "Check complete!" -ForegroundColor Green
    }
    
    default {
        Write-Host "ERROR: Invalid choice. Please run the script again and choose 1, 2, or 3." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Note: After reseeding, refresh your browser to see the changes." -ForegroundColor Cyan
