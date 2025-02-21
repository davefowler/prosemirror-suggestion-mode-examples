import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey("suggestions")

// Create the suggestions plugin
// Default tooltip renderer that can be overridden
const defaultTooltipRenderer = (mark, type) => {
    const date = new Date(mark.attrs.createdAt).toLocaleDateString()
    let text = type === 'delete' ? `Deleted by ${mark.attrs.username} on ${date}` :
                                  `Added by ${mark.attrs.username} on ${date}`
    
    // Add custom data if present
    if (mark.attrs.data) {
        try {
            const customData = typeof mark.attrs.data === 'string' ? 
                             JSON.parse(mark.attrs.data) : 
                             mark.attrs.data
            const dataStr = Object.entries(customData)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')
            text += `\nCustom data: ${dataStr}`
        } catch (e) {
            console.warn('Failed to parse custom data in suggestion mark:', e)
        }
    }
    return text
}

export const suggestionsPlugin = new Plugin({
    key: suggestionsPluginKey,

    state: {
        init() {
            return {
                suggestionMode: true,
                username: 'Anonymous',
                activeMarkRange: null, // Will store {from, to, createdAt}
                showDeletedText: false // New setting to control deletion display
            }
        },
        
        apply(tr, value) {
            const meta = tr.getMeta(suggestionsPlugin)
            if (meta) {
                // Handle all meta updates, not just suggestionMode
                return {
                    ...value,
                    ...meta
                }
            }
            
            // Update mark positions based on document changes
            if (tr.docChanged && value.activeMarkRange) {
                return {
                    ...value,
                    activeMarkRange: {
                        from: tr.mapping.map(value.activeMarkRange.from),
                        to: tr.mapping.map(value.activeMarkRange.to),
                        createdAt: value.activeMarkRange.createdAt
                    }
                }
            }
            return value
        }
    },

    props: {
        decorations(state) {
            const decos = []
            state.doc.descendants((node, pos) => {
                const addMark = node.marks.find(m => m.type === state.schema.marks.suggestion_add)
                const delMark = node.marks.find(m => m.type === state.schema.marks.suggestion_delete)
                
                if (addMark) {
                    const tooltipContent = this.spec.tooltipRenderer?.(addMark, 'add') || 
                                         defaultTooltipRenderer(addMark, 'add')
                    decos.push(
                        Decoration.widget(pos, () => {
                            const tooltip = document.createElement('div')
                            tooltip.className = 'suggestion-tooltip'
                            tooltip.textContent = tooltipContent
                            return tooltip
                        }, {
                            side: -1,
                            key: `suggestion-add-${pos}`,
                            class: 'suggestion-tooltip-wrapper'
                        })
                    )
                }
                
                if (delMark) {
                    const tooltipContent = this.spec.tooltipRenderer?.(delMark, 'delete') || 
                                         defaultTooltipRenderer(delMark, 'delete')
                    decos.push(
                        Decoration.widget(pos, () => {
                            const tooltip = document.createElement('div')
                            tooltip.className = 'suggestion-tooltip'
                            tooltip.textContent = tooltipContent
                            return tooltip
                        }, {
                            side: -1,
                            key: `suggestion-delete-${pos}`,
                            class: 'suggestion-tooltip-wrapper'
                        })
                    )
                }
            })
            return DecorationSet.create(state.doc, decos)
        },

        handleKeyDown(view, event) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            // Handle delete and backspace
            if (event.key === "Delete" || event.key === "Backspace") {
                const tr = view.state.tr
                const {$from, $to} = view.state.selection
                
                if ($from.pos === $to.pos) {
                    const delFrom = event.key === "Backspace" ? $from.pos - 1 : $from.pos
                    const delTo = event.key === "Backspace" ? $from.pos : $from.pos + 1
                    
                    if (delFrom < 0 || delTo > view.state.doc.content.size) return false

                    // Resolve the position just behind the cursor for backspace
                    const $delPos = view.state.doc.resolve(delTo)
                    const node = $delPos.nodeAfter;
                    const marks = node ? node.marks : [];
                    const existingMark = marks.find(m => m.type === view.state.schema.marks.suggestion_delete);
                    
                    // Additional debugging output
                    console.log('Marks at position', $delPos.pos, ':', marks);
                    console.log('Existing suggestion_delete mark:', existingMark);
                    console.log('the letter at position', $delPos.pos, 'is', node ? node.text : 'N/A', node ? node.type : 'N/A');
                    
                    if (existingMark) {
                        console.log('existing mark found', existingMark)
                        // Expand the existing mark
                        tr.removeMark(
                            existingMark.attrs.from,
                            existingMark.attrs.to,
                            view.state.schema.marks.suggestion_delete
                        )
                        console.log('removed mark from', existingMark.attrs.from, 'to', existingMark.attrs.to)

                        const newFrom = Math.min(existingMark.attrs.from, delFrom)
                        const newTo = Math.max(existingMark.attrs.to, delTo)
                        tr.addMark(
                            newFrom,
                            newTo,
                            view.state.schema.marks.suggestion_delete.create({
                                createdAt: existingMark.attrs.createdAt,
                                username: state.username,
                                data: state.data
                            })
                        )
                        console.log('extended mark to', newFrom, newTo)
                    } else {
                        // Apply a new suggestion_delete mark
                        const deleteMark = view.state.schema.marks.suggestion_delete.create({
                            createdAt: Date.now(),
                            username: state.username
                        })
                        console.log('adding new mark from', delFrom, 'to', delTo)
                        tr.addMark(delFrom, delTo, deleteMark)
                    }

                    // Move cursor appropriately
                    if (event.key === "Backspace") {
                        tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(delFrom)))
                    } else {
                        tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(delTo)))
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
            // First remove any existing marks in the range
            if (to > from) {
                tr.removeMark(from, to, view.state.schema.marks.suggestion_add)
            }

            // Insert the text
            tr.insertText(text, from, to)

            // Create new mark with current timestamp and username
            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: Date.now(),
                username: state.username,
                data: state.data
            })

            // Apply mark to the newly inserted text
            tr.addMark(from, from + text.length, addMark)

            view.dispatch(tr)
            return true
        }
    }
})
