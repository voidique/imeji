import { LegalShell, Section } from "@/components/legal-shell"

export const metadata = {
  title: "Privacy · Imeji",
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" updated="June 2026">
      <p className="text-foreground text-lg leading-relaxed">
        Your thoughts are yours. This page explains, in plain language, what
        Imeji collects and how we treat it.
      </p>

      <Section heading="What we collect">
        <p>
          When you create an account we store your name, email address, and an
          encrypted password. The maps and concepts you create are saved so you
          can return to them.
        </p>
      </Section>

      <Section heading="How we use it">
        <p>
          We use your data only to operate Imeji — to authenticate you, to keep
          your maps in sync, and to improve the experience. We do not sell your
          personal information.
        </p>
      </Section>

      <Section heading="Your maps">
        <p>
          The content you create belongs to you. You can edit or permanently
          delete any map at any time; deleting a map removes its concepts from
          our systems.
        </p>
      </Section>

      <Section heading="Your choices">
        <p>
          You may request a copy of your data or ask us to delete your account.
          Reach out and we&apos;ll take care of it.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about privacy? Email us at{" "}
          <span className="text-foreground">privacy@imeji.app</span>.
        </p>
      </Section>
    </LegalShell>
  )
}
