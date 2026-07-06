import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { BrandLayout, link, pickLocale, text, type Locale } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: (s: string) => string
  heading: string
  intro: (s: string, oldE: string, newE: string) => React.ReactNode
  body: string
  cta: string
  footer: string
}> = {
  en: {
    preview: (s) => `Confirm your email change for ${s}`,
    heading: 'Confirm your new email 💧',
    intro: (s, oldE, newE) => (
      <>
        You requested to change your email address for <strong>{s}</strong> from{' '}
        <Link href={`mailto:${oldE}`} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>{oldE}</Link>{' '}
        to{' '}
        <Link href={`mailto:${newE}`} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>{newE}</Link>.
      </>
    ),
    body: 'Click the button below to confirm this change.',
    cta: 'Confirm email change',
    footer: "If you didn't request this change, please secure your account immediately.",
  },
  fr: {
    preview: (s) => `Confirmez le changement d'e-mail pour ${s}`,
    heading: "Confirmez votre nouvel e-mail 💧",
    intro: (s, oldE, newE) => (
      <>
        Vous avez demandé à changer votre adresse e-mail pour <strong>{s}</strong> de{' '}
        <Link href={`mailto:${oldE}`} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>{oldE}</Link>{' '}
        vers{' '}
        <Link href={`mailto:${newE}`} style={{ color: '#E0F2FE', textDecoration: 'underline' }}>{newE}</Link>.
      </>
    ),
    body: 'Cliquez sur le bouton ci-dessous pour confirmer ce changement.',
    cta: "Confirmer le changement",
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, sécurisez votre compte immédiatement.",
  },
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
  locale,
}: EmailChangeEmailProps) => {
  const l = pickLocale(locale)
  const c = COPY[l]
  return (
    <BrandLayout
      locale={l}
      preview={c.preview(siteName)}
      heading={c.heading}
      intro={c.intro(siteName, oldEmail, newEmail)}
      body={<Text style={text}>{c.body}</Text>}
      cta={{ label: c.cta, href: confirmationUrl }}
      footer={c.footer}
    />
  )
}

export default EmailChangeEmail
