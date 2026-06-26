import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
}

const WelcomeEmail = ({ name }: Props) => {
  const greeting = name && name.trim().length > 0 ? `Salut ${name} 👋` : "Salut 👋";
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Bienvenue dans H2GO — ton coach hydratation au quotidien 💧</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={brandMark}>H2GO 💧</Text>
            <Heading as="h1" style={h1}>
              {greeting}
            </Heading>
            <Text style={lead}>
              Bienvenue dans H2GO — ton coach hydratation premium. On est ravis de t'accompagner pour
              transformer chaque gorgée en une vraie habitude.
            </Text>
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>
              Ce que H2GO fait pour toi
            </Heading>

            <Text style={feature}>
              <span style={emoji}>📸</span>
              <strong style={featureTitle}>Gorgées vérifiées par IA</strong>
              <br />
              <span style={featureBody}>
                Une photo rapide de ton verre ou de ta bouteille suffit : notre IA confirme la prise
                d'eau et la logue automatiquement.
              </span>
            </Text>

            <Text style={feature}>
              <span style={emoji}>🔥</span>
              <strong style={featureTitle}>Streaks &amp; XP</strong>
              <br />
              <span style={featureBody}>
                Garde ta série quotidienne, gagne de l'XP à chaque gorgée validée, et grimpe les
                ligues du leaderboard.
              </span>
            </Text>

            <Text style={feature}>
              <span style={emoji}>🌳</span>
              <strong style={featureTitle}>Ton arbre d'hydratation</strong>
              <br />
              <span style={featureBody}>
                Plus tu bois régulièrement, plus ton arbre grandit. Une récompense visuelle qui
                ancre durablement l'habitude.
              </span>
            </Text>

            <Text style={feature}>
              <span style={emoji}>⏰</span>
              <strong style={featureTitle}>Rappels personnalisés</strong>
              <br />
              <span style={featureBody}>
                Reçois des notifications intelligentes adaptées à ton rythme pour ne plus jamais
                oublier de boire.
              </span>
            </Text>

            <Text style={feature}>
              <span style={emoji}>📊</span>
              <strong style={featureTitle}>Statistiques &amp; objectifs</strong>
              <br />
              <span style={featureBody}>
                Suis tes progrès jour après jour et atteins ton objectif quotidien calculé selon
                ton profil.
              </span>
            </Text>
          </Section>

          <Section style={ctaWrap}>
            <Button href="https://h2go-app.com/home" style={cta}>
              Ouvrir H2GO
            </Button>
            <Text style={ctaHint}>Prends ta première gorgée — ton arbre n'attend que toi 🌱</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Tu reçois cet email parce que tu viens de créer ton compte sur H2GO. Bonne hydratation !
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: WelcomeEmail,
  subject: "Bienvenue dans H2GO 💧",
  displayName: "Welcome email",
  previewData: { name: "Camille" },
} satisfies TemplateEntry;

// Brand: primary #3B82F6, secondary #14B8A6, surfaces #DBEAFE / #F8FAFC, ink #0F172A
const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#0F172A",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 20px 48px",
};

const hero: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 55%, #14B8A6 100%)",
  borderRadius: "24px",
  padding: "32px 28px",
  color: "#ffffff",
  textAlign: "center",
};

const brandMark: React.CSSProperties = {
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontSize: "14px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  opacity: 0.85,
  margin: 0,
  color: "#ffffff",
};

const h1: React.CSSProperties = {
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontSize: "30px",
  fontWeight: 700,
  margin: "12px 0 8px",
  color: "#ffffff",
  lineHeight: 1.2,
};

const lead: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.55,
  margin: "8px 0 0",
  color: "#E0F2FE",
};

const card: React.CSSProperties = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #DBEAFE",
  borderRadius: "20px",
  padding: "24px 22px",
  marginTop: "20px",
};

const h2: React.CSSProperties = {
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontSize: "20px",
  fontWeight: 600,
  margin: "0 0 14px",
  color: "#0F172A",
};

const feature: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.55,
  margin: "12px 0",
  color: "#1F2937",
};

const emoji: React.CSSProperties = {
  display: "inline-block",
  marginRight: "8px",
  fontSize: "18px",
};

const featureTitle: React.CSSProperties = {
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontSize: "15px",
  color: "#0F172A",
};

const featureBody: React.CSSProperties = {
  color: "#475569",
};

const ctaWrap: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0 8px",
};

const cta: React.CSSProperties = {
  display: "inline-block",
  background: "linear-gradient(90deg, #3B82F6 0%, #14B8A6 100%)",
  color: "#ffffff",
  fontFamily: "'Fredoka', 'Poppins', sans-serif",
  fontWeight: 600,
  fontSize: "15px",
  padding: "14px 28px",
  borderRadius: "16px",
  textDecoration: "none",
};

const ctaHint: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748B",
  margin: "12px 0 0",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #E2E8F0",
  margin: "32px 0 16px",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#94A3B8",
  textAlign: "center",
  margin: 0,
};
