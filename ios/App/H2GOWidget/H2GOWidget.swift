//
//  H2GOWidget.swift
//  Widget iOS pour H2GO — affiche la progression d'hydratation
//  et l'heure du prochain rappel sur l'écran d'accueil / verrouillage.
//
//  Setup (à faire dans Xcode, voir README.md de ce dossier) :
//   1. File > New > Target > Widget Extension, nom "H2GOWidget".
//   2. Activer App Groups (Signing & Capabilities) côté app ET widget :
//        group.com.h2go.app
//   3. Remplacer le fichier généré par celui-ci.
//   4. Build & run sur device iOS 16+.
//

import WidgetKit
import SwiftUI

private let APP_GROUP = "group.com.h2go.app"
private let SNAPSHOT_KEY = "h2go_widget_snapshot"

// MARK: - Modèle

struct H2GOSnapshot: Codable {
    let intakeMl: Int
    let goalMl: Int
    let percent: Int
    let nextReminderISO: String?
    let updatedAtISO: String

    static let placeholder = H2GOSnapshot(
        intakeMl: 1200, goalMl: 2500, percent: 48,
        nextReminderISO: nil, updatedAtISO: ISO8601DateFormatter().string(from: Date())
    )
}

func loadSnapshot() -> H2GOSnapshot {
    guard let defaults = UserDefaults(suiteName: APP_GROUP),
          let raw = defaults.string(forKey: SNAPSHOT_KEY),
          let data = raw.data(using: .utf8),
          let snap = try? JSONDecoder().decode(H2GOSnapshot.self, from: data) else {
        return H2GOSnapshot.placeholder
    }
    return snap
}

// MARK: - Timeline

struct H2GOEntry: TimelineEntry {
    let date: Date
    let snapshot: H2GOSnapshot
}

struct H2GOProvider: TimelineProvider {
    func placeholder(in context: Context) -> H2GOEntry {
        H2GOEntry(date: Date(), snapshot: .placeholder)
    }
    func getSnapshot(in context: Context, completion: @escaping (H2GOEntry) -> Void) {
        completion(H2GOEntry(date: Date(), snapshot: loadSnapshot()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<H2GOEntry>) -> Void) {
        let entry = H2GOEntry(date: Date(), snapshot: loadSnapshot())
        // Re-fetch chaque 15 min — WidgetKit fait du best-effort.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - UI

private let H2GO_BLUE = Color(red: 0x3B/255, green: 0x82/255, blue: 0xF6/255)
private let H2GO_BG   = Color(red: 0x0F/255, green: 0x17/255, blue: 0x2A/255)

func nextReminderLabel(from iso: String?) -> String {
    guard let iso = iso, let d = ISO8601DateFormatter().date(from: iso) else { return "—" }
    let f = DateFormatter(); f.dateFormat = "HH:mm"
    return f.string(from: d)
}

struct H2GOWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: H2GOEntry

    var body: some View {
        let s = entry.snapshot
        ZStack {
            LinearGradient(colors: [H2GO_BG, .black], startPoint: .topLeading, endPoint: .bottomTrailing)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("💧 H2GO").font(.system(size: 13, weight: .semibold)).foregroundColor(.white.opacity(0.8))
                    Spacer()
                    Text("\(s.percent)%").font(.system(size: 13, weight: .bold)).foregroundColor(H2GO_BLUE)
                }
                Text("\(s.intakeMl) / \(s.goalMl) ml")
                    .font(.system(size: family == .systemSmall ? 18 : 22, weight: .bold))
                    .foregroundColor(.white)
                ProgressView(value: Double(s.percent), total: 100)
                    .progressViewStyle(.linear)
                    .tint(H2GO_BLUE)
                if family != .systemSmall {
                    HStack(spacing: 4) {
                        Image(systemName: "bell.fill").font(.system(size: 11)).foregroundColor(.white.opacity(0.6))
                        Text("Prochain rappel : \(nextReminderLabel(from: s.nextReminderISO))")
                            .font(.system(size: 12)).foregroundColor(.white.opacity(0.8))
                    }
                }
            }
            .padding(12)
        }
    }
}

// MARK: - Widget

@main
struct H2GOWidget: Widget {
    let kind: String = "H2GOWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: H2GOProvider()) { entry in
            if #available(iOS 17.0, *) {
                H2GOWidgetEntryView(entry: entry).containerBackground(.black, for: .widget)
            } else {
                H2GOWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("H2GO")
        .description("Suis ton hydratation et l'heure du prochain rappel.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}
