import {Plugin, PluginKey} from "prosemirror-state"

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey("suggestions")

// Create the suggestions plugin
export const suggestionsPlugin = new Plugin({
    key: suggestionsPluginKey,

    state: {
        init() {
            return {
                suggestionMode: false
            }
        },
        
        apply(tr, value) {
            const meta = tr.getMeta(suggestionsPlugin)
            if (meta && meta.hasOwnProperty('suggestionMode')) {
                return {
                    suggestionMode: meta.suggestionMode
                }
            }
            return value
        }
    },

    props: {
        handleKeyDown(view, event) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            // Handle deletions (Backspace and Delete keys)
            if (event.keyCode === 8 || event.keyCode === 46) {
                const { $from, $to } = view.state.selection
                if ($from.pos !== $to.pos) {
                    // There is a selection to delete
                    const tr = view.state.tr
                    const mark = view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        hiddenText: view.state.doc.textBetween($from.pos, $to.pos)
                    })
                    tr.addMark($from.pos, $to.pos, mark)
                    view.dispatch(tr)
                    return true
                } else if (event.keyCode === 8 && $from.pos > 0) {
                    // Backspace at a single position
                    const tr = view.state.tr
                    const mark = view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        hiddenText: view.state.doc.textBetween($from.pos - 1, $from.pos)
                    })
                    tr.addMark($from.pos - 1, $from.pos, mark)
                    view.dispatch(tr)
                    return true
                } else if (event.keyCode === 46 && $from.pos < view.state.doc.content.size) {
                    // Delete at a single position
                    const tr = view.state.tr
                    const mark = view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        hiddenText: view.state.doc.textBetween($from.pos, $from.pos + 1)
                    })
                    tr.addMark($from.pos, $from.pos + 1, mark)
                    view.dispatch(tr)
                    return true
                }
            }
            return false
        },

        handleTextInput(view, from, to, text) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            // Add suggestion mark to new text
            const tr = view.state.tr
            tr.insertText(text, from, to)
            const mark = view.state.schema.marks.suggestion_add.create({
                createdAt: Date.now()
            })
            tr.addMark(from, from + text.length, mark)
            view.dispatch(tr)
            return true
        }
    }
})
