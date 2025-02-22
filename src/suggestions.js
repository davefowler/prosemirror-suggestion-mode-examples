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
            const pluginState = this.getState(state)
            const decos = []
            
            state.doc.descendants((node, pos) => {
                // Handle suggestion_add marks
                const addMark = node.marks.find(m => m.type.name === 'suggestion_add')
                if (addMark) {
                    decos.push(
                        Decoration.widget(pos, () => {
                            const tooltip = document.createElement('div')
                            tooltip.className = 'suggestion-tooltip'
                            tooltip.textContent = defaultTooltipRenderer(addMark, 'add')
                            return tooltip
                        }, {
                            side: -1,
                            key: `suggestion-add-${pos}`,
                            class: 'suggestion-tooltip-wrapper'
                        })
                    )
                }
                
                // Handle suggestion_delete marks
                const delMark = node.marks.find(m => m.type.name === 'suggestion_delete')
                if (delMark) {
                    if (!pluginState.showDeletedText) {
                        // When not showing deleted text, create a deletion marker with hover tooltip
                        decos.push(
                            Decoration.widget(pos, () => {
                                const container = document.createElement('span')
                                container.className = 'deletion-marker'
                                
                                // Create the hover tooltip
                                const tooltip = document.createElement('span')
                                tooltip.className = 'deletion-tooltip'
                                tooltip.textContent = node.text || ''
                                container.appendChild(tooltip)
                                
                                return container
                            }, {
                                side: -1,
                                key: `deletion-marker-${pos}`
                            })
                        )
                        
                        // Hide the actual deleted text
                        decos.push(
                            Decoration.inline(pos, pos + node.nodeSize, {
                                class: 'suggestion-delete hidden'
                            })
                        )
                    } else {
                        // When showing deleted text, show it with strikethrough
                        decos.push(
                            Decoration.inline(pos, pos + node.nodeSize, {
                                class: 'suggestion-delete visible'
                            })
                        )
                    }
                    
                    // Add metadata tooltip (author, date, etc.)
                    decos.push(
                        Decoration.widget(pos, () => {
                            const tooltip = document.createElement('div')
                            tooltip.className = 'suggestion-tooltip'
                            tooltip.textContent = defaultTooltipRenderer(delMark, 'delete')
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
            console.log('handleKeyDown: suggestionMode is', state.suggestionMode, 'and event.key is', event.key)
            if (!state.suggestionMode) return false

            // Handle delete and backspace
            if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                
                const tr = view.state.tr
                const {$from, $to} = view.state.selection
                console.log('handleKeyDown: deleting', $from.pos, $to.pos)
                let delFrom = $from.pos
                let delTo = $to.pos
                
                if ($from.pos === $to.pos) {
                    delFrom = event.key === "Backspace" ? $from.pos - 1 : $from.pos
                    delTo = event.key === "Backspace" ? $from.pos : $from.pos + 1
                }
                if (delFrom < 0 || delTo > view.state.doc.content.size) return false;

                // Check if any part of the selected range is inside a suggestion_add mark
                let isInsideAddMark = false;
                view.state.doc.nodesBetween(delFrom, delTo, (node, pos) => {
                    const marks = node.marks || [];
                    if (marks.some(m => m.type === view.state.schema.marks.suggestion_add)) {
                        isInsideAddMark = true;
                        return false; // let it continue and perform the delete
                    }
                });

                if (isInsideAddMark) {
                    console.log('Selection is inside an add mark');
                    // Perform a regular delete, not a suggestion_delete
                    return false; // let it continue and perform the delete
                }

                // check if a suggestion_delete mark exists just after this selection
                const $delPos = view.state.doc.resolve(delTo)
                const node = $delPos.nodeAfter;
                const marks = node ? node.marks : [];
                const existingMark = marks.find(m => m.type === view.state.schema.marks.suggestion_delete);
                
                // Additional debugging output
                console.log('Marks at position', $delPos.pos, ':', marks);
                console.log('Existing suggestion_delete mark:', existingMark);
                console.log('the letter at position', $delPos.pos, 'is', node ? node.text : 'N/A', node ? node.type : 'N/A');
                
                if (existingMark) {
                    let markFrom = $delPos.pos;
                    let markTo = $delPos.pos;

                    // Find the start of the mark
                    while (markFrom > 0) {
                        const $pos = view.state.doc.resolve(markFrom - 1);
                        if (!$pos.nodeAfter || !$pos.nodeAfter.marks.some(m => m.eq(existingMark))) {
                            break;
                        }
                        markFrom--;
                    }

                    // Find the end of the mark
                    while (markTo < view.state.doc.content.size) {
                        const $pos = view.state.doc.resolve(markTo);
                        if (!$pos.nodeAfter || !$pos.nodeAfter.marks.some(m => m.eq(existingMark))) {
                            break;
                        }
                        markTo++;
                    }

                    console.log('Existing mark range:', markFrom, 'to', markTo);
                    // You can now use markFrom and markTo as needed
                

                    // Expand the existing mark
                    tr.removeMark(
                        markFrom,
                        markTo,
                        view.state.schema.marks.suggestion_delete
                    )
                    console.log('removed mark from', markFrom, 'to', markTo)
                    // extend the del range to include the existing mark
                    delFrom =  Math.min(markFrom, delFrom)
                    delTo = Math.max(markTo, delTo)
                }

                // create a new suggestion_delete mark
                tr.addMark(
                    delFrom,
                    delTo,
                    view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        username: state.username,
                        data: state.data
                    })
                )
                console.log('created suggestion_delete mark in range', delFrom, delTo)

                // Move cursor appropriately
                if (event.key === "Backspace") {
                    tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(delFrom)))
                } else {
                    tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(delTo)))
                }

                view.dispatch(tr)
                return true // delete handled.  returning true to stop further processing
            }
            return false
        },

        handleTextInput(view, from, to, text) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            // Check if the input text matches the text being deleted
            const deletedText = view.state.doc.textBetween(from, to);
            if (text === deletedText) {
                console.log('Ignoring redundant input:', text);
                return true;  // ignore the redundant input
            }

            console.log('handleTextInput', from, to, text.length, 'text is:', text)
            const tr = view.state.tr

            // check if this input is inside an existing suggestion_add or suggestion_delete mark
            const $pos = view.state.doc.resolve(from)
            const node = $pos.nodeAfter;
            const marks = node ? node.marks : [];
            const existingMark = marks.find(m => m.type === view.state.schema.marks.suggestion_add || m.type === view.state.schema.marks.suggestion_delete);

            if (existingMark) {
                console.log('handleTextInput: input is already inside an existing suggestion_add or suggestion_delete mark.')
                return false; // allow the input to be processed
            }
            
            // check if there is a suggestion_add mark immediately before this input
            const $prevPos = view.state.doc.resolve(from)
            const prevNode = $prevPos.nodeBefore;
            const prevMarks = prevNode ? prevNode.marks : [];
            const prevExistingMark = prevMarks.find(m => m.type === view.state.schema.marks.suggestion_add);

            // Insert the text

            let newTo = from + text.length
            let newFrom = from

            if (prevExistingMark) {
                console.log('prevExistingMark found at', $prevPos.pos)
                // find the start of the prevExistingMark
                const markTo = $prevPos.pos;
                let markFrom = markTo;
                while (markFrom > 0) {
                    const $pos = view.state.doc.resolve(markFrom - 1);
                    if (!$pos.nodeAfter || !$pos.nodeAfter.marks.some(m => m.eq(prevExistingMark))) {
                        break;
                    }
                    markFrom--;
                }

                console.log('removing prevExistingMark range:', markFrom, 'to', markTo)
                // remove the prevExistingMark
                tr.removeMark(markFrom, markTo, view.state.schema.marks.suggestion_add)

                // extend the suggestion_add range to include the existing mark
                newFrom =  Math.min(markFrom, from)
                newTo = Math.max(markTo, from + text.length)
                console.log('extended suggestion_add range to:', newFrom, 'to', newTo)
            }

            console.log('inserting text', text, 'at', from, 'to', to)
            tr.insertText(text, from, to)

            console.log('creating new suggestion_add mark at', newFrom, 'to', newTo)
            // Create new mark with current timestamp and username
            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: Date.now(),
                username: state.username,
                data: state.data
            })

            // Apply mark to the newly inserted text
            tr.addMark(newFrom, newTo, addMark)

            view.dispatch(tr)
            return true; // input handled.  returning true to stop further processing
        }
    }
})
