import {Plugin, PluginKey} from "prosemirror-state"

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey("suggestions")

// Create the suggestions plugin
export const suggestionsPlugin = new Plugin({
    key: suggestionsPluginKey,

    state: {
        init() {
            return {
                suggestionMode: true,
                username: 'Anonymous'
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
                        hiddenText: selectedText,
                        username: this.getState(view.state).username
                    })
                    tr.addMark($from.pos, $to.pos, mark)
                    tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve($to.pos)))
                    view.dispatch(tr)
                    console.log('Suggestion deletion:', {
                        type: 'selection',
                        text: selectedText,
                        from: $from.pos,
                        to: $to.pos
                    })
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

                    const deletedText = view.state.doc.textBetween(deletePos, pos)
                    const mark = view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        hiddenText: deletedText,
                        username: this.getState(view.state).username
                    })
                    tr.addMark(deletePos, pos, mark)
                    
                    // Move cursor for backspace
                    if (event.keyCode === 8) {
                        tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(deletePos)))
                    }
                    
                    view.dispatch(tr)
                    console.log('Suggestion deletion:', {
                        type: event.keyCode === 8 ? 'backspace' : 'delete',
                        text: deletedText,
                        pos: deletePos
                    })
                    return true
                }
            }
            return false
        },

        handleTextInput(view, from, to, text) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            const tr = view.state.tr

            // If there's selected text, mark it as deleted first
            if (from !== to) {
                const selectedText = view.state.doc.textBetween(from, to)
                const deleteMark = view.state.schema.marks.suggestion_delete.create({
                    createdAt: Date.now(),
                    hiddenText: selectedText
                })
                tr.addMark(from, to, deleteMark)
                
                console.log('Suggestion deletion before input:', {
                    text: selectedText,
                    from,
                    to
                })
            }

            // Then handle the new text input
            tr.insertText(text, from, to)

            // Check if there's an existing suggestion_add mark right before this position
            let markFrom = from
            if (from > 0) {
                const beforeMarks = view.state.doc.resolve(from - 1).marks()
                const existingAddMark = beforeMarks.find(mark => 
                    mark.type.name === 'suggestion_add' &&
                    mark.attrs.username === this.getState(view.state).username
                )
                
                if (existingAddMark) {
                    // Find the start of the existing mark
                    let pos = from - 1
                    while (pos > 0) {
                        const marks = view.state.doc.resolve(pos - 1).marks()
                        const hasSameMark = marks.some(m => 
                            m.type.name === 'suggestion_add' &&
                            m.attrs.username === existingAddMark.attrs.username
                        )
                        if (!hasSameMark) break
                        pos--
                    }
                    markFrom = pos
                }
            }

            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: existingAddMark ? existingAddMark.attrs.createdAt : Date.now(),
                username: this.getState(view.state).username
            })
            tr.addMark(markFrom, from + text.length, addMark)
            
            console.log('Suggestion addition:', {
                text,
                from: markFrom,
                to: from + text.length
            })
            
            view.dispatch(tr)
            return true
        }
    }
})
