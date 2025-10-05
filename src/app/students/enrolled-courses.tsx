import React from "react";

const mockEnrolledCourses = [
  { id: 1, title: "Introduction to Programming", status: "In Progress" },
  { id: 2, title: "Web Development Bootcamp", status: "In Progress" },
];

export default function EnrolledCoursesTable() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Enrolled Courses</h2>
      <table className="min-w-full bg-white/10 rounded-lg overflow-hidden">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-white">Course Title</th>
            <th className="px-4 py-2 text-left text-white">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockEnrolledCourses.map((course) => (
            <tr key={course.id} className="border-b border-white/20">
              <td className="px-4 py-2 text-white">{course.title}</td>
              <td className="px-4 py-2 text-white">{course.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
