import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { HelpCircle, Mail, Phone, MessageSquare, LifeBuoy, BookOpen, Shield } from 'lucide-react';

export default function HelpSupportPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <Card className="border-0 bg-gradient-to-br from-purple-900/60 to-indigo-900/70 text-white shadow-xl">
        <CardHeader className="pb-3 flex flex-row gap-3 items-center">
          <LifeBuoy className="w-8 h-8 text-fuchsia-300" />
          <CardTitle className="!mb-0 text-2xl font-bold tracking-tight flex-1">Help & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-none space-y-5 pb-1">
            <li className="flex gap-4 items-start">
              <HelpCircle className="w-5 h-5 mt-1 text-purple-400" />
              <div>
                <span className="font-medium text-fuchsia-200">Knowledge Base:</span>
                <br />
                <span className="text-slate-100/90">Check our extensive docs for common questions about exams, dashboards, and features.</span>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <MessageSquare className="w-5 h-5 mt-1 text-purple-400" />
              <div>
                <span className="font-medium text-fuchsia-200">Live Chat:</span>
                <br />
                <span className="text-slate-100/90">For urgent issues, use the in-app chat support (bottom-right icon).</span>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <Mail className="w-5 h-5 mt-1 text-purple-400" />
              <div>
                <span className="font-medium text-fuchsia-200">Email Us:</span>
                <br />
                <a className="text-slate-100 underline" href="mailto:support@upscmentor.ai">support@upscmentor.ai</a>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <Phone className="w-5 h-5 mt-1 text-purple-400" />
              <div>
                <span className="font-medium text-fuchsia-200">Call:</span>
                <br />
                <span className="text-slate-100/90">+91 99999 88888 (Mon-Fri 9am-6pm)</span>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <BookOpen className="w-5 h-5 mt-1 text-purple-400" />
              <div>
                <span className="font-medium text-fuchsia-200">Student Guide:</span>
                <br />
                <a className="text-slate-100 underline" href="/guide" target="_blank" rel="noopener">Read the Quick Start Guide</a>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <Shield className="w-5 h-5 mt-1 text-purple-400" />
              <div>
                <span className="font-medium text-fuchsia-200">Account & Security:</span>
                <br />
                <span className="text-slate-100/90">Having login/trust issues? <a href="/profile" className="underline">Go to profile settings</a> or contact support for help.</span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

