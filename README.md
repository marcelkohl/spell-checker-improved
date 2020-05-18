[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)
[![GPLv3 license](https://img.shields.io/badge/License-GPLv3-blue.svg)](http://perso.crans.org/besson/LICENSE.html)
[![Generic badge](https://img.shields.io/badge/status-not_ready_for_release-red.svg)](https://shields.io/)
[![Ask Me Anything !](https://img.shields.io/badge/Ask%20me-anything-1abc9c.svg)](https://GitHub.com/Naereen/ama)


# Spell Checker Improved
This is an improved spell checker atom plugin that supports camelCases, PascalCases, dashed-words, snake_style_words and word with apostrophes.

Also, the plan is to have a a good integration with additional plugins that can listen to the spell checker, providing a better checker.

## Install
As this plugin is still in development it is not officially published at the atom plugins list and if you want to use, test or help just clone/download the project and add it to your atom/packages folder.

## To do
- priority 0
  - :heavy_check_mark: spell checker language configurable;
  - :heavy_check_mark: matches camelCase, PascalCase, dashed-words, snake_style_words, word with apostrophes;
  - :heavy_check_mark: acceptable performance;
  - :heavy_check_mark: add suggestions on context menu with replace method;
  - :heavy_check_mark: add word with custom file for know words per project (folder);
- priority 1
  - :heavy_check_mark: make checker and marker as promises;
  - :heavy_check_mark: folded blocks must work
- priority 2
  - :heavy_check_mark: create resource to load custom plugins for additional checkings;
  - :heavy_check_mark: create plugin for language (php, javascript, common-tech-words);
  - :heavy_check_mark: add an icon to show status of checking/misspells;
  - add event onMisspellMarked(misspelled with target coordinates) so other plugins can get updates about this plugin and extend, like for minimap;
- priority 4
  - custom color for the marker;
  - publish on atom plugins list;
- priority 5
  - add more than one language to the translators
  - :heavy_check_mark: improve checker marker performance
  - :heavy_check_mark: create list of editable file types on settings of every plugin;
  - add shortcut to auto correct selected word with the first suggestion from spellchecker (to avoid navigate into the menu)
  - clicking on statusbar icon focus on next misspelled word;
  
## Copyright
Status bar icon based on [grammar icon](https://www.flaticon.com/packs/text-editing-1) made by [bqlqn](https://www.flaticon.com/authors/bqlqn)

Checked, working and alert icon made by [Pixel perfect](https://www.flaticon.com/authors/pixel-perfect)
