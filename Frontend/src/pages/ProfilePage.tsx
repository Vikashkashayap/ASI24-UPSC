import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User, Mail, Calendar, Award, BookOpen, Target, TrendingUp, Edit2, Save, X } from "lucide-react";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");

  const handleSave = () => {
    // TODO: Implement API call to update user profile
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(user?.name || "");
    setIsEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
          Profile
        </h1>
        <p className={`text-sm md:text-base ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
          Manage your account settings and view your progress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
                  <CardDescription>Update your profile details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-sm py-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      className="flex items-center gap-2 text-sm py-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="flex items-center gap-2 text-sm py-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
                  theme === "dark" 
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white" 
                    : "bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700"
                }`}>
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className={`text-xl font-semibold px-3 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  ) : (
                    <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                      {user?.name}
                    </h2>
                  )}
                  <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    UPSC Aspirant
                  </p>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
                  }`}>
                    <Mail className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Email</p>
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100"
                  }`}>
                    <Calendar className={`w-5 h-5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Member Since</p>
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                      {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Study Preferences */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl" />
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Study Preferences</CardTitle>
              <CardDescription>Customize your learning experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    Preferred Subjects
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Polity", "History", "Geography", "Economy"].map((subject) => (
                      <span
                        key={subject}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          theme === "dark"
                            ? "bg-purple-900/30 text-purple-300 border border-purple-700/50"
                            : "bg-purple-100 text-purple-700 border border-purple-300"
                        }`}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-2xl" />
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
                  }`}>
                    <Award className={`w-4 h-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                  </div>
                  <div>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Evaluations</p>
                    <p className={`text-lg font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>0</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100"
                  }`}>
                    <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
                  </div>
                  <div>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Tests Taken</p>
                    <p className={`text-lg font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>0</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-teal-900/30" : "bg-teal-100"
                  }`}>
                    <Target className={`w-4 h-4 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
                  </div>
                  <div>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Avg Score</p>
                    <p className={`text-lg font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>0%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === "dark" ? "bg-cyan-900/30" : "bg-cyan-100"
                  }`}>
                    <TrendingUp className={`w-4 h-4 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                  </div>
                  <div>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Progress</p>
                    <p className={`text-lg font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>0%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

