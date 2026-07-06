import * as React from 'react'
import { BrandLayout, pickLocale, type Locale } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: Locale
}

const COPY: Record<Locale, {
  preview: (s: string) => string
  heading: string
  intro: (s: string) => string
  cta: string
  hint: string
  footer: string
}> = {
  en: {
    preview: (s) => `Your login link for ${s}`,
    heading: 'Your login link 💧',
    intro: (s) => `Click the button below to log in to ${s}. This link will expire shortly.`,
    cta: 'Log in to H2GO',
    hint: 'Single-use link — expires soon.',
    footer: "If you didn't request this link, you can safely ignore this email.",
  },
  fr: {
    preview: (s) => `Votre lien de connexion pour ${s}`,
    heading: 'Votre lien de connexion 💧',
    intro: (s) => `Cliquez sur le bouton ci-dessous pour vous connecter à ${s}. Ce lien expirera bientôt.`,
    cta: 'Me connecter à H2GO',
    hint: 'Lien à usage unique — expire rapidement.',
    footer: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  },
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  locale,
}: MagicLinkEmailProps) => {
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
      ctaHint={c.hint}
      footer={c.footer}
    />
  )
}

export default MagicLinkEmail
