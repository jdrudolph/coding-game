#!/usr/bin/env python3
"""Bundle src/ into a single self-contained index.html (and an artifact body variant)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(here, 'src', f), encoding='utf-8').read()
head = src('head.html')
css = src('style.css')
js = '\n'.join(src(f) for f in ['data.js', 'engine.js', 'render.js', 'audio.js', 'game.js', 'screens.js'])
body = f'{head}<style>\n{css}</style>\n<div id="root"></div>\n<script>\n"use strict";\n{js}\nboot();\n</script>\n'
full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        f'{head}<style>\n{css}</style>\n</head>\n<body>\n<div id="root"></div>\n<script>\n"use strict";\n{js}\nboot();\n</script>\n</body>\n</html>\n')
open(os.path.join(here, 'index.html'), 'w', encoding='utf-8').write(full)
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
open(os.path.join(here, 'dist', 'artifact.html'), 'w', encoding='utf-8').write(body)
print('index.html', len(full), 'bytes')
