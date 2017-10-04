# Bug report: https://bugs.chromium.org/p/chromium/issues/detail?id=720597&can=2&start=0&num=100&q=&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified&groupby=&sort=
# Description: https://tinyio.wordpress.com/2017/06/17/solving-this-extension-may-have-been-corrupted-in-chrome-version-59/

import os
import glob
size_dir = {}
for filename in glob.iglob('./**/*.*', recursive=True):
    size = os.path.getsize(filename)
    if size % 4096 == 0 and size != 0:
        size_dir[filename] = os.path.getsize(filename)


for name, size in size_dir.items():
    print(name, size)

print('complete')
