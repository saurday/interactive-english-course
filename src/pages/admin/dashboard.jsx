import React, { useState } from "react";
import {
  BookOpen,
  PenTool,
  MessageCircle,
  Headphones,
  Search,
  Filter,
} from "lucide-react";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const progressData = [
    { skill: "Reading",   recordings: "2/8 Recordings",  icon: BookOpen,     color: "text-blue-600",   bgColor: "bg-blue-50" },
    { skill: "Writing",   recordings: "4/15 Recordings", icon: PenTool,      color: "text-orange-600", bgColor: "bg-orange-50" },
    { skill: "Speaking",  recordings: "10/25 Recordings",icon: MessageCircle, color: "text-yellow-600", bgColor: "bg-yellow-50" },
    { skill: "Listening", recordings: "7/13 Recordings", icon: Headphones,   color: "text-green-600",  bgColor: "bg-green-50" },
  ];

  const unitCourses = [
    { title: "Reading",  bg: "from-yellow-200 to-yellow-300",  icon: "📖" },
    { title: "Writing",  bg: "from-blue-200 to-purple-300",    icon: "✍️" },
    { title: "Speaking", bg: "from-pink-200 to-purple-300",    icon: "🗣️" },
    { title: "Listening",bg: "from-green-200 to-teal-300",     icon: "🎧" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header (inside main, since Sidebar is layout) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">O</span>
            </div>
            <span className="font-semibold text-gray-900">
              Interactive English Course
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your course here..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-80 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button className="h-9 px-3 rounded-md hover:bg-gray-100 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Page Title + Tabs */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-3">Dashboard</h1>
      <div className="flex gap-6 mb-6">
        <button className="text-purple-600 font-medium border-b-2 border-purple-600 pb-2">
          Dashboard
        </button>
        <button className="text-gray-600 hover:text-gray-900 pb-2">
          Lesson
        </button>
        <button className="text-gray-600 hover:text-gray-900 pb-2">
          Task
        </button>
      </div>

      {/* Hero banner */}
      <div className="mb-8 rounded-2xl shadow-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="p-8">
          <h2 className="text-3xl font-bold mb-3">Test Your English!</h2>
          <p className="text-lg mb-6/">
            Try our quick online tests to find out what your level of English is and
            which English Qualification might be best for you.
          </p>
          <button className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-md transition-colors">
            Test Now
          </button>
        </div>
      </div>

      {/* Your Progress */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {progressData.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.skill} className="border border-gray-200 rounded-xl bg-white">
                <div className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.skill}</p>
                    <p className="text-sm text-gray-600">{item.recordings}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unit Course */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Unit Course</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unitCourses.map((c) => (
            <button
              key={c.title}
              className={`rounded-2xl shadow-md bg-gradient-to-br ${c.bg} hover:shadow-lg transition-shadow`}
            >
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">{c.icon}</div>
                <h4 className="text-2xl font-semibold text-gray-800">{c.title}</h4>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
