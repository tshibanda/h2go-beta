import * as React from 'react'
import { Link } from '@react-email/components'
import { BrandLayout, pickLocale, type Locale } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: (s: string) => string
  heading: string
  intro: (s: string, url: string) => React.ReactNode
  cta: string
  footer: string
}> = {
  en: {
    preview: (s) => `You've been invited to join ${s}`,
    heading: "You're invited 💧",
    intro: (s, url) => (
      <>
        You've been invited to join{' '}
        <Link href={url} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>
          <strong>{s}</strong>
        </Link>. Accept the invitation to create your account and start tracking your hydration.
      </>
    ),
    cta: 'Accept invitation',
    footer:
      "If you weren't expecting this invitation, you can safely ignore this email.",
  },
  fr: {
    preview: (s) => `Vous êtes invité·e à rejoindre ${s}`,
    heading: 'Vous êtes invité·e 💧',
    intro: (s, url) => (
      <>
        Vous êtes invité·e à rejoindre{' '}
        <Link href={url} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>
          <strong>{s}</strong>
        </Link>. Acceptez l'invitation pour créer votre compte et démarrer votre suivi d'hydratation.
      </>
    ),
    cta: "Accepter l'invitation",
    footer:
      "Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.",
  },
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  locale,
}: InviteEmailProps) => {
  const l = pickLocale(locale)
  const c = COPY[l]
  return (
    <BrandLayout
      locale={l}
      preview={c.preview(siteName)}
      heading={c.heading}
      intro={c.intro(siteName, siteUrl)}
      body={null}
      cta={{ label: c.cta, href: confirmationUrl }}
      footer={c.footer}
    />
  )
}

export default InviteEmail
