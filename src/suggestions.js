import {Plugin, PluginKey} from "prosemirror-state"

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey("suggestions")

// Create the suggestions plugin
export const suggestionsPlugin = new Plugin({
    key: suggestionsPluginKey,

    state: {
        init() {
            return {
                suggestionMode: true
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
                event.preventDefault(); // Prevent default deletion behavior
                
                const { $from, $to } = view.state.selection
                const tr = view.state.tr

                // Check if we're inside a suggestion_add mark
                const marks = $from.marks()
                if (marks.some(mark => mark.type.name === 'suggestion_add')) {
                    return false // Let normal deletion happen inside suggestion_add
                }

                if ($from.pos !== $to.pos) {
                    // Handle selection deletion
                    const selectedText = view.state.doc.textBetween($from.pos, $to.pos)
                    if (!selectedText.length) return false
                    
                    const mark = view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        hiddenText: selectedText
                    })
                    tr.addMark($from.pos, $to.pos, mark)
                    tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve($to.pos)))
                    view.dispatch(tr)
                    return true
                } else {
                    // Handle single character deletion
                    let pos, deletePos
                    if (event.keyCode === 8 && $from.pos > 0) { // Backspace
                        deletePos = $from.pos - 1
                        pos = $from.pos
                    } else if (event.keyCode === 46 && $from.pos < view.state.doc.content.size) { // Delete
                        deletePos = $from.pos
                        pos = $from.pos + 1
                    } else {
                        return false
                    }

                    // Check if the character to delete already has suggestion marks
                    const deleteMarks = view.state.doc.resolve(deletePos).marks()
                    if (deleteMarks.some(mark => 
                        mark.type.name === 'suggestion_add' || 
                        mark.type.name === 'suggestion_delete'
                    )) {
                        return false // Let normal deletion happen for already marked text
                    }

                    const mark = view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        hiddenText: view.state.doc.textBetween(deletePos, pos)
                    })
                    tr.addMark(deletePos, pos, mark)
                    
                    // Move cursor for backspace
                    if (event.keyCode === 8) {
                        tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(deletePos)))
                    }
                    
                    view.dispatch(tr)
                    return true
                }
            }
            return false
        },

        handleTextInput(view, from, to, text) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            const tr = view.state.tr

            // If there's selected text, mark it as deleted and replace with new text
            if (from !== to) {
                // Get the selected text
                const selectedText = view.state.doc.textBetween(from, to)
                
                // Create the deletion mark
                const deleteMark = view.state.schema.marks.suggestion_delete.create({
                    createdAt: Date.now(),
                    hiddenText: selectedText
                })
                
                // Create the addition mark
                const addMark = view.state.schema.marks.suggestion_add.create({
                    createdAt: Date.now()
                })
                
                // First replace the text
                tr.replaceWith(from, to, view.state.schema.text(text))
                
                // Then apply the marks in order: first deletion on old text position
                tr.addMark(from, from + text.length, deleteMark)
                
                // Then addition mark on the new text
                tr.addMark(from, from + text.length, addMark)
            } else {
                // Just insert new text with addition mark
                tr.insertText(text, from, to)
                const addMark = view.state.schema.marks.suggestion_add.create({
                    createdAt: Date.now()
                })
                tr.addMark(from, from + text.length, addMark)
            }
            
            view.dispatch(tr)
            return true
        }
    }
})
