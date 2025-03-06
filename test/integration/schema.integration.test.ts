import { Schema, MarkSpec } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { suggestionMarks, addSuggestionMarks } from '../../src/schema';

describe('suggestionMarks', () => {
  test('contains the expected mark specifications', () => {
    expect(suggestionMarks).toHaveProperty('suggestion_add');
    expect(suggestionMarks).toHaveProperty('suggestion_delete');
    
    expect(suggestionMarks.suggestion_add).toHaveProperty('attrs');
    expect(suggestionMarks.suggestion_delete).toHaveProperty('attrs');
  });
});

describe('addSuggestionMarks', () => {
  test('adds suggestion marks to a plain object', () => {
    const marks: Record<string, MarkSpec> = {
      strong: {
        parseDOM: [{ tag: 'strong' }],
        toDOM: () => ['strong', 0],
      },
      em: {
        parseDOM: [{ tag: 'i' }],
        toDOM: () => ['i', 0],
      },
    };
    
    const enhanced = addSuggestionMarks(marks);
    
    // Should retain original marks
    expect(enhanced).toHaveProperty('strong');
    expect(enhanced).toHaveProperty('em');
    
    // Should add suggestion marks
    expect(enhanced).toHaveProperty('suggestion_add');
    expect(enhanced).toHaveProperty('suggestion_delete');
  });
  
  test('adds suggestion marks to an existing ProseMirror schema marks', () => {
    const enhanced = addSuggestionMarks(basicSchema.spec.marks);
    
    // Should retain basic schema marks
    expect(enhanced).toHaveProperty('strong');
    expect(enhanced).toHaveProperty('em');
    expect(enhanced).toHaveProperty('link');
    
    // Should add suggestion marks
    expect(enhanced).toHaveProperty('suggestion_add');
    expect(enhanced).toHaveProperty('suggestion_delete');
  });
  
  test('creates a valid schema when used with Schema constructor', () => {
    // This tests that the typings work correctly
    const testSchema = new Schema({
      nodes: basicSchema.spec.nodes,
      marks: addSuggestionMarks(basicSchema.spec.marks)
    });
    
    // Should be a valid schema with all marks
    expect(testSchema.marks).toHaveProperty('strong');
    expect(testSchema.marks).toHaveProperty('suggestion_add');
    expect(testSchema.marks).toHaveProperty('suggestion_delete');
    
    // Test schema can create document with suggestion marks
    const doc = testSchema.node('doc', null, [
      testSchema.node('paragraph', null, [
        testSchema.text('Hello, '),
        testSchema.text('world', [testSchema.mark('suggestion_add', { username: 'tester' })]),
        testSchema.text('!')
      ])
    ]);
    
    expect(doc).toBeTruthy();
    expect(doc.toString()).toContain('suggestion_add');
  });
});

describe('Schema with suggestion marks', () => {
  // Create a test schema with our suggestion marks
  const testSchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        parseDOM: [{ tag: 'p' }],
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' }
    },
    marks: addSuggestionMarks({
      strong: {
        parseDOM: [{ tag: 'strong' }],
        toDOM: () => ['strong', 0],
      }
    })
  });
  
  test('can create and serialize documents with suggestion marks', () => {
    // Create a document with suggestion_add mark
    const doc = testSchema.node('doc', null, [
      testSchema.node('paragraph', null, [
        testSchema.text('This is '),
        testSchema.text('added text', [
          testSchema.mark('suggestion_add', { 
            username: 'user1',
            createdAt: '2023-01-01'
          })
        ]),
        testSchema.text('.')
      ])
    ]);
    
    // Import DOMSerializer
    const { DOMSerializer } = require('prosemirror-model');
    
    // Create a serializer and convert to DOM
    const serializer = DOMSerializer.fromSchema(testSchema);
    const dom = document.createElement('div');
    dom.appendChild(serializer.serializeFragment(doc.content));
    
    // Check that the suggestion mark was properly serialized
    const suggestionSpan = dom.querySelector('.suggestion-add');
    expect(suggestionSpan).toBeTruthy();
    expect(suggestionSpan?.getAttribute('data-suggestion-add')).toBe('true');
    expect(suggestionSpan?.textContent).toBe('added text');
  });
  
  test('can parse HTML with suggestion marks', () => {
    // Create HTML with suggestion marks
    const html = `
      <p>This is <span data-suggestion-add="true" class="suggestion-add">added text</span>.</p>
    `;
    
    // Import DOMParser
    const { DOMParser } = require('prosemirror-model');
    
    // Parse the HTML
    const domNode = document.createElement('div');
    domNode.innerHTML = html;
    
    // Use ProseMirror's DOMParser to parse the HTML into a document
    const parser = DOMParser.fromSchema(testSchema);
    const doc = parser.parse(domNode);
    
    // Extract the text with suggestion mark
    let foundSuggestion = false;
    doc.descendants((node) => {
      if (node.isText && node.marks.some(m => m.type.name === 'suggestion_add')) {
        foundSuggestion = true;
        expect(node.text).toBe('added text');
      }
      return true;
    });
    
    expect(foundSuggestion).toBe(true);
  });
});