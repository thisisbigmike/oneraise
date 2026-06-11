import os
import glob

dashboard_dir = '/home/greaze/Documents/OneRaise/src/app/dashboard'

for filepath in glob.glob(f'{dashboard_dir}/**/*.tsx', recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix components import
    if filepath == f'{dashboard_dir}/page.tsx' or filepath == f'{dashboard_dir}/layout.tsx':
        content = content.replace("'./components'", "'../components'")
        content = content.replace("'./dashboard.css'", "'../shared-dashboard.css'")
    else:
        content = content.replace("'../components'", "'../../components'")
    
    with open(filepath, 'w') as f:
        f.write(content)
