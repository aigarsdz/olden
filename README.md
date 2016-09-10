# Olden

Olden has been born out of necessity. For more than 2 years I've been using MacOS as my primary
OS and I got used to a lot of MacOS specific tools and apps. One of those apps was CopyClip 2, which
is an amazing clipboard manager, and for months I couldn't imagine my life without it, but not long ago
things have changed. I was forced to work on Windows and I had to adopt to the new setup.

Don't get me wrong, I really like Windows 10, but I miss MacOS specific tools on it. I tried to
find CopyClip 2 alternative, but all Windows clipboard managers are either outdated or too
complicated, or doesn't have the same feel to them as CopyClip does. So I made a decision to build
my own clipboard manager that would work on every platform I might end up working on and Olden was born.

Olden is built using the amazing Electron package from GitHub and while still in development it has
not only become an important tool for me on Windows but also replaced CopyClip on MacOS.

![Olden preview](https://raw.githubusercontent.com/aigarsdz/olden/master/assets/screenshots/Screen%20Shot%202016-09-09%20at%202.25.07%20AM.png)

## Installation

For now the installation has to be done manually:

- Clone the repository or download the zip file.
- Make sure you have node installed.
- run `npm run bootstrap` which will install electron-rebuilt and electron-packager.
- run `bower install` which will downlaod Vue.js.
- run `npm run build` which will install the dependencies and copy necessary files to the app folder.
- run `npm run package` which will build packages for all platforms. NOTE: MacOS requires wine to be installed in order to build Windows packages.
