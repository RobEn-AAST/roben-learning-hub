import { Navigation } from "@/components/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Award, BookOpen, Lightbulb, Heart, Globe, Rocket } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            About RobEn Learning Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Empowering learners worldwide through innovative, accessible, and high-quality educational experiences. 
            We believe that everyone deserves access to world-class learning opportunities.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <Card className="shadow-lg border-l-4 border-l-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="h-6 w-6 text-blue-600" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                To democratize education by providing accessible, high-quality learning experiences that 
                empower individuals to achieve their personal and professional goals. We strive to break down 
                barriers to education and create opportunities for lifelong learning.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-green-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Lightbulb className="h-6 w-6 text-green-600" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                To become the world's leading platform for personalized learning, where every learner 
                can discover, grow, and transform their potential into success. We envision a future where 
                quality education knows no boundaries.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Our Story */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Founded with a passion for education and technology, RobEn Learning Hub emerged from the belief that 
              learning should be engaging, accessible, and transformative.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">How We Started</h3>
                <p className="text-gray-700 leading-relaxed">
                  In 2023, our founders recognized the need for a learning platform that combines cutting-edge 
                  technology with personalized education. Starting with a small team of educators and developers, 
                  we set out to create something different.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  What began as a simple idea to make learning more accessible has grown into a comprehensive 
                  platform serving thousands of learners worldwide. Our commitment to quality, innovation, 
                  and student success remains at the heart of everything we do.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">10,000+ Students</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">500+ Courses</span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full">
                    <Award className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">95% Success Rate</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                  <Globe className="h-16 w-16 mb-6 opacity-80" />
                  <h4 className="text-xl font-bold mb-4">Global Impact</h4>
                  <p className="text-blue-100 leading-relaxed">
                    Our platform now reaches learners across 50+ countries, offering courses in multiple 
                    languages and catering to diverse learning styles and needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-lg text-gray-600">The principles that guide everything we do</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-lg text-center hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <Heart className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Student-Centered</h3>
                <p className="text-sm text-gray-600">
                  Every decision we make prioritizes student success and learning outcomes.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg text-center hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <Rocket className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">Innovation</h3>
                <p className="text-sm text-gray-600">
                  We embrace new technologies and methods to enhance the learning experience.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg text-center hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <Globe className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">Accessibility</h3>
                <p className="text-sm text-gray-600">
                  Quality education should be available to everyone, regardless of background.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg text-center hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <Award className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-lg font-semibold mb-2">Excellence</h3>
                <p className="text-sm text-gray-600">
                  We maintain the highest standards in content quality and platform performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-lg text-gray-600">
              Passionate educators, developers, and innovators working together to transform education
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">RB</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Robert Ben</h3>
                <p className="text-blue-600 font-medium mb-2">CEO & Co-Founder</p>
                <p className="text-sm text-gray-600">
                  Visionary leader with 15+ years in education technology and a passion for making learning accessible.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">SA</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Sarah Ahmed</h3>
                <p className="text-green-600 font-medium mb-2">CTO & Co-Founder</p>
                <p className="text-sm text-gray-600">
                  Technology expert and former Google engineer, dedicated to building scalable learning platforms.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg text-center">
              <CardContent className="pt-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">MR</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Dr. Maria Rodriguez</h3>
                <p className="text-purple-600 font-medium mb-2">Head of Curriculum</p>
                <p className="text-sm text-gray-600">
                  Educational psychologist with expertise in curriculum design and personalized learning approaches.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Join Our Learning Community</h2>
          <p className="text-xl mb-6 text-blue-100">
            Be part of a global community of learners, educators, and innovators
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link href="/courses">Explore Courses</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/auth?mode=signup">Get Started Today</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src="/assets/roben-logo.png" alt="RobEn Logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bold">RobEn Learning Hub</span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-blue-200 transition-colors">Home</Link>
              <Link href="/about" className="hover:text-blue-200 transition-colors">About</Link>
              <Link href="/courses" className="hover:text-blue-200 transition-colors">Courses</Link>
              <Link href="/contact" className="hover:text-blue-200 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}