import * as React from 'react'
import { BrandLayout, pickLocale, type Locale } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: (s: string) => string
  heading: string
  intro: (s: string) => string
  cta: string
  footer: string
}> = {
  en: {
    preview: (s) => `Reset your password for ${s}`,
    heading: 'Reset your password 💧',
    intro: (s) =>
      `We received a request to reset your password for ${s}. Click the button below to choose a new password.`,
    cta: 'Reset password',
    footer:
      "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.",
  },
  fr: {
    preview: (s) => `Réinitialisez votre mot de passe pour ${s}`,
    heading: 'Réinitialisez votre mot de passe 💧',
    intro: (s) =>
      `Nous avons reçu une demande de réinitialisation de votre mot de passe pour ${s}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.`,
    cta: 'Réinitialiser le mot de passe',
    footer:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. Votre mot de passe ne sera pas modifié.",
  },
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  locale,
}: RecoveryEmailProps) => {
  const l = pickLocale(locale)
  const c = COPY[l]
  return (
    <BrandLayout
      locale={l}
      preview={c.preview(siteName)}
      heading={c.heading}
      intro={c.intro(siteName)}
      body={null}
      cta={{ label: c.cta, href: confirmationUrl }}
      footer={c.footer}
    />
  )
}

export default RecoveryEmail
