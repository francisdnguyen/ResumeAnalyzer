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
            variables: {
              colorBackground: "#111827",
              colorTextSecondary: "#9ca3af",
              colorTextOnPrimaryBackground: "#ffffff",
              colorInputBackground: "#1f2937",
              colorInputText: "#f9fafb",
              colorNeutral: "#6b7280",
              colorPrimary: "#3b82f6",
              colorDanger: "#ef4444",
              fontFamily: "inherit",
              borderRadius: "0.5rem",
            },
            elements: {
              rootBox: "w-full",
              card: "bg-gray-900 shadow-none rounded-none border-0",
              navbar: "bg-gray-900 border-r border-gray-800",
              navbarButton:
                "text-gray-400 hover:text-white hover:bg-gray-800 data-[active=true]:bg-gray-800 data-[active=true]:text-white",
              navbarButtonIcon: "text-current",
              pageScrollBox: "bg-gray-900 pt-6",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              profileSectionTitle: "text-white border-gray-800",
              profileSectionTitleText: "text-white",
              profileSectionContent: "text-gray-300",
              profileSectionPrimaryButton:
                "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10",
              accordionTriggerButton: "text-gray-300 hover:text-white",
              accordionContent: "text-gray-400",
              formFieldLabel: "text-gray-300",
              formFieldInput:
                "bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-500",
              formButtonPrimary:
                "bg-white text-gray-950 hover:bg-gray-100 font-semibold shadow-none",
              formButtonReset: "text-gray-400 hover:text-white",
              badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
              avatarImageActionsUpload: "text-blue-400 hover:text-blue-300",
              avatarImageActionsRemove: "text-red-400 hover:text-red-300",
              dividerLine: "bg-gray-800",
              dividerText: "text-gray-600",
            },
          }}
        />
      </div>
    </div>
  );
}
