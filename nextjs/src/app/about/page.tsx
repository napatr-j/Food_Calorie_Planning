import { Navbar } from '@/components/navbar'
import { Camera, Flame, BookOpen, BarChart3, AlertTriangle, CheckCircle, Info } from 'lucide-react'

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 mb-5">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
        <span className="text-gray-dark">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Item({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 mb-4 last:mb-0">
      <div className="mt-0.5 text-gray-mid flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-primary">{title}</p>
        <p className="text-sm text-gray-dark mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="page-fade max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-primary">About FoodCalorie</h1>
          <p className="text-gray-dark mt-2">
            An AI-powered food recognition and calorie tracking application for Thai cuisine.
          </p>
        </div>

        <Section icon={<CheckCircle size={20} />} title="Features">
          <Item
            icon={<Camera size={18} />}
            title="AI Food Recognition"
            desc="Upload a photo of your meal and our AI model will identify the food and provide calorie and nutrition estimates."
          />
          <Item
            icon={<Flame size={18} />}
            title="Calorie Tracking"
            desc="Automatically log meals to your daily calorie tracker. View progress toward your personal daily goal."
          />
          <Item
            icon={<BookOpen size={18} />}
            title="Food Library"
            desc="Browse a library of 148 foods with detailed nutrition information including protein, fat, carbohydrates, and sugar."
          />
          <Item
            icon={<BarChart3 size={18} />}
            title="7-Day History"
            desc="Review your food log for the past 7 days, grouped by date, to track eating patterns over time."
          />
        </Section>

        <Section icon={<AlertTriangle size={20} />} title="Limitations & Important Notes">
          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-bg border border-border-col/40 rounded-lg">
              <Info size={16} className="text-gray-mid flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-dark">
                <span className="font-semibold text-primary">Approximate calorie values: </span>
                Calorie and nutrition data are estimates based on standard portions. Actual values vary by preparation method, ingredients, and serving size.
              </p>
            </div>
            <div className="flex gap-3 p-3 bg-bg border border-border-col/40 rounded-lg">
              <Info size={16} className="text-gray-mid flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-dark">
                <span className="font-semibold text-primary">AI predictions may be incorrect: </span>
                The AI model is trained on specific food images. Predictions may fail for uncommon dishes, poor lighting, or mixed dishes. Always verify the result.
              </p>
            </div>
            <div className="flex gap-3 p-3 bg-bg border border-border-col/40 rounded-lg">
              <Info size={16} className="text-gray-mid flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-dark">
                <span className="font-semibold text-primary">Low-confidence results are hidden: </span>
                If the AI confidence is below 60%, no prediction is shown. Upload a clearer, better-lit photo of a single dish for best results.
              </p>
            </div>
            <div className="flex gap-3 p-3 bg-bg border border-border-col/40 rounded-lg">
              <Info size={16} className="text-gray-mid flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-dark">
                <span className="font-semibold text-primary">Not a medical tool: </span>
                TDEE and BMI calculations are based on the Mifflin-St Jeor equation and serve as general guides. For personalized dietary advice, consult a healthcare professional.
              </p>
            </div>
          </div>
        </Section>

        <Section icon={<Info size={20} />} title="Tips for Best Results">
          <ul className="space-y-2 text-sm text-gray-dark">
            <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Photograph one dish at a time — mixed plates reduce accuracy.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Use good lighting. Avoid dark photos or harsh shadows.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Take the photo from directly above or at a slight angle.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Make sure the food fills most of the frame.</li>
            <li className="flex gap-2"><span className="text-primary font-bold">5.</span> Supported formats: JPG, JPEG, PNG.</li>
          </ul>
        </Section>
      </main>
    </>
  )
}
