-- This script will reseed quiz data for the "Frontend Quiz" lesson
-- Run this in your Supabase SQL editor or using the Supabase CLI

-- First, let's verify we have the lesson
DO $$
DECLARE
  lesson_quiz_id uuid;
  quiz_id uuid;
  q1_id uuid;
  q2_id uuid;
  q3_id uuid;
  q4_id uuid;
BEGIN
  -- Find the Frontend Quiz lesson
  SELECT id INTO lesson_quiz_id 
  FROM lessons 
  WHERE title = 'Frontend Quiz' AND lesson_type = 'quiz'
  LIMIT 1;

  IF lesson_quiz_id IS NULL THEN
    RAISE NOTICE 'Frontend Quiz lesson not found. Please check your lessons table.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found lesson ID: %', lesson_quiz_id;

  -- Delete existing quiz data for this lesson (if any)
  DELETE FROM question_options 
  WHERE question_id IN (
    SELECT id FROM questions 
    WHERE quiz_id IN (
      SELECT id FROM quizzes WHERE lesson_id = lesson_quiz_id
    )
  );

  DELETE FROM questions 
  WHERE quiz_id IN (
    SELECT id FROM quizzes WHERE lesson_id = lesson_quiz_id
  );

  DELETE FROM quizzes WHERE lesson_id = lesson_quiz_id;

  -- Create the quiz
  INSERT INTO quizzes (lesson_id, title, description, passing_score, time_limit_minutes)
  VALUES (lesson_quiz_id, 'Frontend Quiz', 'Test your HTML, CSS, and frontend knowledge', 100, 15)
  RETURNING id INTO quiz_id;

  RAISE NOTICE 'Created quiz ID: %', quiz_id;

  -- Question 1: What does HTML stand for?
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz_id, 'What does HTML stand for?', 'multiple_choice', 1, 1)
  RETURNING id INTO q1_id;

  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q1_id, 'Hyper Text Markup Language', true, 1),
  (q1_id, 'High Tech Modern Language', false, 2),
  (q1_id, 'Home Tool Markup Language', false, 3),
  (q1_id, 'Hyperlinks Text Markup Language', false, 4);

  -- Question 2: CSS property for text color?
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz_id, 'CSS property for text color?', 'multiple_choice', 1, 2)
  RETURNING id INTO q2_id;

  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q2_id, 'color', true, 1),
  (q2_id, 'text-color', false, 2),
  (q2_id, 'font-color', false, 3),
  (q2_id, 'text-style', false, 4);

  -- Question 3: Flexbox is for responsive layouts
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz_id, 'Flexbox is for responsive layouts', 'true_false', 1, 3)
  RETURNING id INTO q3_id;

  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q3_id, 'True', true, 1),
  (q3_id, 'False', false, 2);

  -- Question 4: Tag for largest heading?
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz_id, 'Tag for largest heading?', 'multiple_choice', 1, 4)
  RETURNING id INTO q4_id;

  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q4_id, '<h1>', true, 1),
  (q4_id, '<h6>', false, 2),
  (q4_id, '<heading>', false, 3),
  (q4_id, '<head>', false, 4);

  RAISE NOTICE 'Successfully created 4 questions with their options!';

  -- Verify the data
  RAISE NOTICE 'Total questions: %', (SELECT COUNT(*) FROM questions WHERE quiz_id = quiz_id);
  RAISE NOTICE 'Total options: %', (SELECT COUNT(*) FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = quiz_id));
END $$;

-- Verify the quiz data was created
SELECT 
  q.id as quiz_id,
  q.title as quiz_title,
  COUNT(DISTINCT ques.id) as total_questions,
  COUNT(qo.id) as total_options
FROM quizzes q
LEFT JOIN questions ques ON ques.quiz_id = q.id
LEFT JOIN question_options qo ON qo.question_id = ques.id
WHERE q.title = 'Frontend Quiz'
GROUP BY q.id, q.title;
