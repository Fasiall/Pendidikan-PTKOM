import re, os

src = r"D:/Website/Pendidikan-PTKOM/archive/original/materi.js"
with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the DUMMY_MATERIALS declaration
# pattern: const DUMMY_MATERIALS = [ ... ];
# We'll find the start index
start = content.find('const DUMMY_MATERIALS = [')
if start == -1:
    raise ValueError('Not found')
# Now find matching closing bracket for the array
i = start
brace = 0
in_string = False
string_char = ''
escaped = False
while i < len(content):
    ch = content[i]
    if not escaped:
        if ch == '\\':
            escaped = True
        elif not in_string and ch in ('"', "'", '`'):
            in_string = True
            string_char = ch
        elif in_string and ch == string_char:
            in_string = False
        elif not in_string:
            if ch == '[':
                brace += 1
            elif ch == ']':
                brace -= 1
                if brace == 0:
                    # found closing bracket of array
                    # need to include following semicolon possibly
                    end = i+1
                    # skip whitespace
                    while end < len(content) and content[end] in ' \t\r\n':
                        end += 1
                    if end < len(content) and content[end] == ';':
                        end += 1
                    break
    else:
        escaped = False
    i += 1
else:
    raise ValueError('No matching bracket')

declaration = content[start:end]
# Write to js/materi-data.js
os.makedirs('D:/Website/Pendidikan-PTKOM/frontend/js', exist_ok=True)
with open('D:/Website/Pendidikan-PTKOM/frontend/js/materi-data.js', 'w', encoding='utf-8') as f:
    f.write(declaration + '\n')

# Remove that declaration from content, keep rest
new_content = content[:start] + content[end:]
# Write new materi.js to frontend/materi.js
with open('D:/Website/Pendidikan-PTKOM/frontend/materi.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Extracted length:', len(declaration))
print('Remaining length:', len(new_content))