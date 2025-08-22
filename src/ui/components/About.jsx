import React from "react";
import { Heart, Code, Palette, Zap, Shield, Users } from "lucide-react";
import logoWhite from "../../assets/logo_white.png";
import logoBlack from "../../assets/logo_black.png";

export default function About({ isDark }) {
  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">About & Credits</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main About Section */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 flex items-center justify-center">
              <img 
                src={isDark ? logoWhite : logoBlack} 
                alt="Attendance Pro Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">About Attendance Pro</h3>
              <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Enterprise Attendance Management</p>
            </div>
          </div>
          <p className="text-light-textSecondary dark:text-dark-textSecondary mb-6 leading-relaxed">
            This Attendance Dashboard was crafted with <Heart className="inline w-4 h-4 text-red-500" /> by the Elsewady HR Tech Team.
            We believe in building beautiful, modern, and efficient tools for the workplace that make attendance management seamless and intuitive.
          </p>
          <p className="text-light-textSecondary dark:text-dark-textSecondary mb-6 leading-relaxed">
            Our mission is to provide enterprise-grade attendance solutions that work seamlessly with ZKTeco devices, 
            offering both face and fingerprint verification while maintaining a clean, professional interface.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-light-accent dark:text-dark-accent" />
              <span className="text-sm text-light-text dark:text-dark-text">Built with React & Electron</span>
            </div>
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-light-accent dark:text-dark-accent" />
              <span className="text-sm text-light-text dark:text-dark-text">Modern UI/UX Design</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-light-accent dark:text-dark-accent" />
              <span className="text-sm text-light-text dark:text-dark-text">Lightning Fast Performance</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-light-accent dark:text-dark-accent" />
              <span className="text-sm text-light-text dark:text-dark-text">Secure & Reliable</span>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">Development Team</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                H
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg text-light-text dark:text-dark-text">Henok Eyayalem</div>
                <div className="text-sm text-light-textSecondary dark:text-dark-textSecondary mb-1">Lead Developer & Architect</div>
                <div className="text-xs text-light-accent dark:text-dark-accent">Full-Stack Development, System Design</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                I
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg text-light-text dark:text-dark-text">Isam Ahmed</div>
                <div className="text-sm text-light-textSecondary dark:text-dark-textSecondary mb-1">Full-Stack Developer</div>
                <div className="text-xs text-light-accent dark:text-dark-accent">Full-Stack Development, System Design,User Experience</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-8 bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border">
        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">Employee Management</h4>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Comprehensive employee database with attendance tracking</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">Real-time Sync</h4>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Automatic synchronization with ZKTeco devices</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">Modern Interface</h4>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Beautiful, responsive design with dark/light themes</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">Secure & Reliable</h4>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Enterprise-grade security and data protection</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Code className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">Advanced Reports</h4>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Comprehensive reporting and analytics</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">User Friendly</h4>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">Intuitive interface designed for productivity</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <div className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
          &copy; {new Date().getFullYear()} Elsewady HR Tech. All rights reserved.
        </div>
        <div className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
          Version 1.0.0 | Built with React, Electron, and Tailwind CSS
        </div>
      </div>
    </div>
  );
} 