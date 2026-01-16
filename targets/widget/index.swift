import WidgetKit
import SwiftUI

@main
struct MiraWidgetBundle: WidgetBundle {
    var body: some Widget {
        MiraWidget()
        MiraLibraryWidget()
    }
}
