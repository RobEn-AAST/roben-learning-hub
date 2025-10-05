import React from "react";

const mockFinishedCourses = [
  { id: 1, title: "Data Science Essentials", finishedDate: "2025-09-15" },
];

export default function FinishedCoursesTable() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Finished Courses</h2>
      <table className="min-w-full bg-white/10 rounded-lg overflow-hidden">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-white">Course Title</th>
            <th className="px-4 py-2 text-left text-white">Finished Date</th>
          </tr>
        </thead>
        <tbody>
          {mockFinishedCourses.map((course) => (
            <tr key={course.id} className="border-b border-white/20">
              <td className="px-4 py-2 text-white">{course.title}</td>
              <td className="px-4 py-2 text-white">{course.finishedDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
