# Learning Hub - Frontend Application

A modern React-based learning management system built with Vite and Supabase.

## Prerequisites

Before you begin, make sure you have the following installed on your computer:

### 1. Node.js (Required)
- **Download**: Visit [nodejs.org](https://nodejs.org/)
- **Version**: Download the **LTS (Long Term Support)** version
- **Installation**: Run the installer and follow the setup wizard
- **Verify**: Open your terminal/command prompt and type:
  ```bash
  node --version
  npm --version
  ```
  You should see version numbers if installed correctly.

### 2. Git (Recommended)
- **Download**: Visit [git-scm.com](https://git-scm.com/)
- **Installation**: Run the installer with default settings
- **Verify**: Open terminal and type:
  ```bash
  git --version
  ```

### 3. Code Editor (Recommended)
- **VS Code**: Download from [code.visualstudio.com](https://code.visualstudio.com/)
- **Alternative**: Any text editor works (Sublime Text, Atom, etc.)

## Getting Started

### Step 1: Download the Project

#### Option A: Using Git (Recommended)
```bash
git clone https://github.com/RobEn-AAST/roben-learning-hub.git
cd roben-learning-hub
```



### Step 2: Install Dependencies

Open your terminal/command prompt in the project folder and run:

```bash
npm install
```

This command will:
- Download all required packages
- Set up the project dependencies
- May take 2-5 minutes depending on your internet speed

**Note**: You might see some warnings - this is normal and usually safe to ignore.

### Step 3: Set Up Environment Variables

1. Find the file named `.env.example` in the project root
2. Open it with your text editor
3. You should see something like:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_key_here
   ```
4. Replace the values with your actual Supabase credentials
5. Save the file as .env

**Important**: Never share your `.env` file publicly or commit it to version control!

### Step 4: Start the Development Server

In your terminal, run:

```bash
npm run dev
```

You should see output similar to:
```
VITE v7.1.4  ready in 252 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 5: Open in Browser

1. Open your web browser
2. Go to: `http://localhost:5173/`
3. You should see the Learning Hub application!


## Common Issues & Solutions

### Problem: "npm is not recognized"
**Solution**: Node.js is not installed or not in PATH
- Reinstall Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal/computer
- Make sure to use the installer (not just extracting files)

### Problem: "Permission denied" or "EACCES error"
**Solution**: 
- **Windows**: Run terminal as Administrator
- **Mac/Linux**: Use `sudo npm install` (not recommended) or fix npm permissions
- **Better solution**: Use a Node version manager like nvm

### Problem: "Port 5173 is already in use"
**Solution**: 
- Close other development servers
- Or change the port by running: `npm run dev -- --port 3000`

### Problem: Page shows "Cannot connect to Supabase"
**Solution**: 
- Check your `.env` file has correct Supabase credentials
- Verify your internet connection
- Make sure Supabase project is active

### Problem: "Module not found" errors
**Solution**: 
- Delete `node_modules` folder
- Delete `package-lock.json` file
- Run `npm install` again


## Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install

# Install a new package
npm install package-name

# Check for outdated packages
npm outdated
```


## Course Player (Coursera-like)

A Coursera-style learning experience is available under `/courses/[courseId]/learn`:

- Sidebar with course outline and completion ticks
- Main area renders Video, Article, and Quiz lessons
- Progress via "Mark as Complete", Previous/Next navigation

APIs used:

- `GET /api/courses/[courseId]` returns course, modules, and lessons with `content_type` and optional `quizId`.
- `POST /api/lessons/[lessonId]/progress` marks a lesson as completed.
- `GET /api/quizzes/[quizId]` provides quiz with questions and options for the renderer.

Key components:

- `src/components/course-player/LessonContentRenderer.tsx`
- `src/components/course-player/QuizRenderer.tsx`

Try it:

1. Open a course page at `/courses/[courseId]` and enroll.
2. Click "Start/Continue" to go to `/courses/[courseId]/learn`.
3. Choose a quiz item, answer, and submit to see scoring and lesson completion.

