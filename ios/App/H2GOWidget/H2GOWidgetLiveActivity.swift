//
//  H2GOWidgetLiveActivity.swift
//  H2GOWidget
//
//  Created by Elie TSHIBANDA on 28/06/2026.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct H2GOWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct H2GOWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: H2GOWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension H2GOWidgetAttributes {
    fileprivate static var preview: H2GOWidgetAttributes {
        H2GOWidgetAttributes(name: "World")
    }
}

extension H2GOWidgetAttributes.ContentState {
    fileprivate static var smiley: H2GOWidgetAttributes.ContentState {
        H2GOWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: H2GOWidgetAttributes.ContentState {
         H2GOWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: H2GOWidgetAttributes.preview) {
   H2GOWidgetLiveActivity()
} contentStates: {
    H2GOWidgetAttributes.ContentState.smiley
    H2GOWidgetAttributes.ContentState.starEyes
}
