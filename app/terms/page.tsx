import { LegalShell, Section } from "@/components/legal-shell"

export const metadata = {
  title: "Terms · Imeji",
}

export default function TermsPage() {
  return (
    <LegalShell title="Terms" updated="June 2026">
      <p className="text-foreground text-lg leading-relaxed">
        By using Imeji you agree to a few simple things. We&apos;ve kept them
        short and readable.
      </p>

      <Section heading="Using Imeji">
        <p>
          Imeji is a tool for capturing and visualizing ideas. Use it lawfully
          and don&apos;t attempt to disrupt the service or access accounts that
          aren&apos;t yours.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You&apos;re responsible for keeping your login credentials safe and
          for the activity that happens under your account.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          You retain ownership of the maps and concepts you create. You grant us
          only the permissions needed to store and display that content back to
          you.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          Imeji is provided “as is.” We work hard to keep it reliable, but we
          can&apos;t guarantee uninterrupted access and aren&apos;t liable for
          losses arising from downtime.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms as Imeji evolves. Continued use after an
          update means you accept the revised terms.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms? Email{" "}
          <span className="text-foreground">hello@imeji.app</span>.
        </p>
      </Section>
    </LegalShell>
  )
}
