// $(function() {
//     // document.getElementById('filter').onkeyup = filterLinks;
//     // document.getElementById('regex').onchange = filterLinks;
//     // document.getElementById('toggle_all').onchange = toggleAll;
//     // document.getElementById('download0').onclick = downloadCheckedLinks;
//     // document.getElementById('download1').onclick = downloadCheckedLinks;
//
//     chrome.windows.getCurrent(
//         function (currentWindow) {
//             chrome.tabs.query({active: true, windowId: currentWindow.id},
//                 function(activeTabs) {
//                     chrome.tabs.executeScript(activeTabs[0].id, {file: 'content/content_script.js', allFrames: true});
//                 });
//     });
// });