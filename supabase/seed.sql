-- Seed: 1 course, 2 modules, 8 lessons (video, article, quiz, project x2)
TRUNCATE TABLE video_questions, question_options, questions, quizzes, projects, lesson_progress, videos, articles, lessons, modules, course_enrollments, courses CASCADE;

INSERT INTO courses (slug, title, description, status)
VALUES ('fullstack-dev', 'Full Stack Web Development', 'Learn modern web development', 'published');

DO $$
DECLARE
  cid uuid; m1 uuid; m2 uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid; l6 uuid; l7 uuid; l8 uuid;
  quiz1 uuid; quiz2 uuid;
  q1 uuid; q2 uuid; q3 uuid; q4 uuid; q5 uuid; q6 uuid; q7 uuid; q8 uuid;
BEGIN
  SELECT id INTO cid FROM courses WHERE slug = 'fullstack-dev';
  
  INSERT INTO modules (course_id, title, description, position)
  VALUES (cid, 'Frontend', 'HTML CSS JavaScript', 1) RETURNING id INTO m1;
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m1, 'HTML Intro', 'video', 1) RETURNING id INTO l1;
  INSERT INTO videos (lesson_id, provider, provider_video_id, url, duration_seconds)
  VALUES (l1, 'youtube', 'qz0aGYrrlhU', 'https://youtu.be/qz0aGYrrlhU?si=U6dSwmOYK6xImPaR', 1800);
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m1, 'CSS Guide', 'article', 2) RETURNING id INTO l2;
  INSERT INTO articles (lesson_id, content, reading_time_minutes)
  VALUES (l2, 'CSS: selectors, box model, flexbox', 20);
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m1, 'Frontend Quiz', 'quiz', 3) RETURNING id INTO l3;
  INSERT INTO quizzes (lesson_id, title, description, passing_score, time_limit_minutes)
  VALUES (l3, 'Frontend Quiz', 'Test your knowledge', 100, 15) RETURNING id INTO quiz1;
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz1, 'What does HTML stand for?', 'multiple_choice', 1, 1) RETURNING id INTO q1;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q1, 'Hyper Text Markup Language', true, 1), (q1, 'High Tech Modern Language', false, 2),
  (q1, 'Home Tool Markup Language', false, 3), (q1, 'Hyperlinks Text Markup Language', false, 4);
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz1, 'CSS property for text color?', 'multiple_choice', 1, 2) RETURNING id INTO q2;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q2, 'color', true, 1), (q2, 'text-color', false, 2), (q2, 'font-color', false, 3), (q2, 'text-style', false, 4);
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz1, 'Flexbox is for responsive layouts', 'true_false', 1, 3) RETURNING id INTO q3;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q3, 'True', true, 1), (q3, 'False', false, 2);
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz1, 'Tag for largest heading?', 'multiple_choice', 1, 4) RETURNING id INTO q4;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q4, '<h1>', true, 1), (q4, '<h6>', false, 2), (q4, '<heading>', false, 3), (q4, '<head>', false, 4);
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m1, 'Build Portfolio', 'project', 4) RETURNING id INTO l4;
  INSERT INTO projects (lesson_id, title, description, submission_instructions)
  VALUES (l4, 'Portfolio Site', 'Build responsive portfolio', 'Submit GitHub link');
  
  INSERT INTO modules (course_id, title, description, position)
  VALUES (cid, 'Backend', 'Node Express', 2) RETURNING id INTO m2;
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m2, 'Node Basics', 'video', 1) RETURNING id INTO l5;
  INSERT INTO videos (lesson_id, provider, provider_video_id, url, duration_seconds)
  VALUES (l5, 'youtube', 'TlB_eWDSMt4', 'https://youtu.be/qz0aGYrrlhU?si=U6dSwmOYK6xImPaR', 2100);
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m2, 'Express Framework', 'article', 2) RETURNING id INTO l6;
  INSERT INTO articles (lesson_id, content, reading_time_minutes)
  VALUES (l6, 'Express: build APIs with Node', 25);
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m2, 'Backend Quiz', 'quiz', 3) RETURNING id INTO l7;
  INSERT INTO quizzes (lesson_id, title, description, passing_score, time_limit_minutes)
  VALUES (l7, 'Backend Quiz', 'Test your knowledge', 100, 15) RETURNING id INTO quiz2;
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz2, 'What is Node.js?', 'multiple_choice', 1, 1) RETURNING id INTO q5;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q5, 'JavaScript runtime on V8', true, 1), (q5, 'Frontend framework', false, 2),
  (q5, 'Database system', false, 3), (q5, 'CSS preprocessor', false, 4);
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz2, 'Install Express command?', 'multiple_choice', 1, 2) RETURNING id INTO q6;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q6, 'npm install express', true, 1), (q6, 'npm get express', false, 2),
  (q6, 'install express', false, 3), (q6, 'node install express', false, 4);
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz2, 'Express is a frontend framework', 'true_false', 1, 3) RETURNING id INTO q7;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q7, 'True', false, 1), (q7, 'False', true, 2);
  
  INSERT INTO questions (quiz_id, content, type, points, position)
  VALUES (quiz2, 'What does app.use() do?', 'multiple_choice', 1, 4) RETURNING id INTO q8;
  INSERT INTO question_options (question_id, content, is_correct, position) VALUES
  (q8, 'Registers middleware', true, 1), (q8, 'Deletes app', false, 2),
  (q8, 'Installs packages', false, 3), (q8, 'Creates user', false, 4);
  
  INSERT INTO lessons (module_id, title, lesson_type, position)
  VALUES (m2, 'Build REST API', 'project', 4) RETURNING id INTO l8;
  INSERT INTO projects (lesson_id, title, description, submission_instructions)
  VALUES (l8, 'REST API', 'Build task API with Express', 'Submit GitHub link');
END $$;