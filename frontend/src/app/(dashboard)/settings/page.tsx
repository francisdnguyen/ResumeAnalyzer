import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Manage your account and profile.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-800">
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-gray-900 shadow-none rounded-none border-0",
              navbar: "bg-gray-900 border-r border-gray-800",
              navbarButton: "text-gray-400 hover:text-white hover:bg-gray-800",
              navbarButtonIcon: "text-gray-500",
              pageScrollBox: "bg-gray-900",
              formFieldInput:
                "bg-gray-800 border-gray-700 text-white placeholder-gray-600 focus:border-blue-500",
              formButtonPrimary:
                "bg-white text-gray-950 hover:bg-gray-100 font-semibold",
              formButtonReset: "text-gray-400 hover:text-white",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              profileSectionTitle: "text-white",
              profileSectionContent: "text-gray-300",
              accordionTriggerButton: "text-gray-300 hover:text-white",
              badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            },
          }}
        />
      </div>
    </div>
  );
}
