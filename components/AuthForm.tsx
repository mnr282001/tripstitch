"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, User, ArrowRight, Calendar, Users, Globe, Clock, Plane, Hotel, Utensils, Compass } from 'lucide-react'

interface AuthFormProps {
  onAuthSuccess: () => void
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        onAuthSuccess()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })
        if (error) throw error
        
        if (data.user && !data.session) {
          setMessage('Check your email for verification link!')
        } else {
          onAuthSuccess()
        }
      }
    } catch (error: Error | unknown) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Calendar,
      title: "Shared Calendars",
      description: "Create and manage shared calendars"
    },
    {
      icon: Users,
      title: "Collaborate",
      description: "Plan trips with friends"
    },
    {
      icon: Globe,
      title: "Anywhere Access",
      description: "Access from any device"
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "See changes instantly"
    }
  ]

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Always at top */}
        <div className="pt-6 lg:pt-8 pb-4 lg:pb-6">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 text-center">
            Plan Your Perfect Trip
            <span className="block text-3xl lg:text-4xl text-blue-600 mt-1">with TripStitch</span>
          </h1>
          <p className="mt-3 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            The easiest way to coordinate travel plans with friends and family
          </p>
        </div>

        <div className="h-[calc(100%-12rem)] flex flex-col-reverse lg:flex-row items-start lg:items-center justify-between">
          {/* Left side - Features */}
          <div className="w-full lg:w-[55%] space-y-6 lg:pt-4">
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-4 lg:p-5 shadow-sm group hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3 lg:space-x-4">
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 lg:p-2.5 group-hover:scale-110 transition-transform">
                        <feature.icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm lg:text-base font-medium text-gray-900">{feature.title}</h3>
                      <p className="mt-1 text-xs lg:text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Journey Timeline */}
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-2 lg:p-2.5">
                    <Plane className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </div>
                  <span className="text-sm lg:text-base text-gray-600">Flights</span>
                </div>
                <div className="flex-1 mx-2 lg:mx-3">
                  <div className="h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2 lg:p-2.5">
                    <Hotel className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </div>
                  <span className="text-sm lg:text-base text-gray-600">Stay</span>
                </div>
                <div className="flex-1 mx-2 lg:mx-3">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-full p-2 lg:p-2.5">
                    <Utensils className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </div>
                  <span className="text-sm lg:text-base text-gray-600">Eat</span>
                </div>
                <div className="flex-1 mx-2 lg:mx-3">
                  <div className="h-1 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full" />
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full p-2 lg:p-2.5">
                    <Compass className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </div>
                  <span className="text-sm lg:text-base text-gray-600">Explore</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth Form */}
          <div className="w-full lg:w-[40%] max-w-md lg:max-w-none mt-8 lg:mt-0">
            <div className="bg-white rounded-xl shadow-xl p-6 lg:p-8">
              <div className="flex mb-4 lg:mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm lg:text-base font-medium transition-colors ${
                    isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm lg:text-base font-medium transition-colors ${
                    !isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-3 lg:space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-900 mb-1 lg:mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 lg:pl-10 pr-3 py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-sm lg:text-base"
                        placeholder="Your full name"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-900 mb-1 lg:mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 lg:pl-10 pr-3 py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-sm lg:text-base"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-900 mb-1 lg:mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 lg:pl-10 pr-3 py-2 lg:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-sm lg:text-base"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {message && (
                  <div className={`p-2 lg:p-3 rounded-lg text-xs lg:text-sm ${
                    message.includes('Check your email') 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 lg:py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] text-sm lg:text-base"
                >
                  {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                  {!loading && <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />}
                </button>
              </form>

              <div className="mt-4 lg:mt-6 text-center text-xs lg:text-sm text-gray-800">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}