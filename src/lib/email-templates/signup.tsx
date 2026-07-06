import * as React from 'react'
import { Link } from '@react-email/components'
import { BrandLayout, link, pickLocale, type Locale } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: (s: string) => string
  heading: string
  intro: (s: string, url: string) => React.ReactNode
  verify: (email: string) => React.ReactNode
  cta: string
  hint: string
  footer: string
}> = {
  en: {
    preview: (s) => `Confirm your email for ${s}`,
    heading: 'Confirm your email 💧',
    intro: (s, url) => (
      <>
        Thanks for signing up for{' '}
        <Link href={url} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>
          <strong>{s}</strong>
        </Link>. One last step to unlock your hydration journey.
      </>
    ),
    verify: (email) => (
      <>
        Please confirm your email address (
        <Link href={`mailto:${email}`} style={link}>{email}</Link>
        ) by clicking the button below.
      </>
    ),
    cta: 'Verify my email',
    hint: 'This link stays valid for a short time.',
    footer: "If you didn't create an account, you can safely ignore this email.",
  },
  fr: {
    preview: (s) => `Confirmez votre e-mail pour ${s}`,
    heading: 'Confirmez votre e-mail 💧',
    intro: (s, url) => (
      <>
        Merci de votre inscription à{' '}
        <Link href={url} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>
          <strong>{s}</strong>
        </Link>. Une dernière étape pour démarrer votre aventure hydratation.
      </>
    ),
    verify: (email) => (
      <>
        Merci de confirmer votre adresse e-mail (
        <Link href={`mailto:${email}`} style={link}>{email}</Link>
        ) en cliquant sur le bouton ci-dessous.
      </>
    ),
    cta: "Confirmer mon e-mail",
    hint: 'Ce lien reste valable un court instant.',
    footer:
      "Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail.",
  },
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  locale,
}: SignupEmailProps) => {
  const l = pickLocale(locale)
  const c = COPY[l]
  return (
    <BrandLayout
      locale={l}
      preview={c.preview(siteName)}
      heading={c.heading}
      intro={c.intro(siteName, siteUrl)}
      body={c.verify(recipient)}
      cta={{ label: c.cta, href: confirmationUrl }}
      ctaHint={c.hint}
      footer={c.footer}
    />
  )
}

export default SignupEmail
