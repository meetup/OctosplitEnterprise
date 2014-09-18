$(document).ready(function() {

  addAllTheCake();
  watchForPageChanges();
  manageNewComment();
  manageTabs();

	//Waiting, to do this, because things get all funky when we execute right
	//when the DOM is ready....
	setTimeout(function() {
		chrome.storage.local.get("sideXside", function(opts) {
			if (opts['sideXside'] === true && $("#octosplit").is(":visible")) {
				$("#octosplit").click();
			}
		});
	}, 500);

	$(".task-list-item-checkbox").each(function() {

		var $elm = $(this);

		console.info($elm.prop("checked"));

		if ( !$elm.prop("checked") ) {
			setTimeout(function() {
				$elm.parentsUntil(".discussion-item").find(".js-details-container").trigger("click");
			}, 250);
		}

	});

});


function addAllTheCake() {
  addWordWrapCheckbox();
  addSideBySideCheckbox();
  addWhitespaceCheckbox();
}

function addWordWrapCheckbox() {
  var $clickFn = function(event) {
    if ($(this).is(':checked')) {
       $('#files_bucket').addClass('word-wrap');
			 var width = ( $("#octosplit").is(":checked") ) ? $(".container").width() / 2 : $(".container").width();
			 $("pre.diff-line-pre").css("max-width", width - 175);
    } else {
       $('#files_bucket').removeClass('word-wrap');
			 $("pre.diff-line-pre").css("max-width", null);
    }
  };

  addOneCheckbox('wordwrap', 'octicon-gift', 'Word wrap', $clickFn, false);
}

function addSideBySideCheckbox() {
  var $clickFn = function(event) {

		if ( $("#wordwrap").is(":checked") ) {
			$("#wordwrap").click();
		}

    if ($(this).is(':checked')) {
      enlarge();
      splitDiffs();
			$("#wordwrap").click();
			$(document.body).addClass("split-diff");
			chrome.storage.local.set({"sideXside": true});
    } else {
      shrink();
      resetDiffs();
			$(document.body).removeClass("split-diff");
			chrome.storage.local.set({"sideXside":false});
    }

  };
  addOneCheckbox('octosplit', 'octicon-mirror-public', 'Side by side', $clickFn, false);
}

function addWhitespaceCheckbox() {
  var $clickFn = function(event) {
    if ($(this).is(':checked')) {
      removeWhitespaceParam();
    } else {
      addWhitespaceParam();
    }
  };
  addOneCheckbox('whitespace', 'octicon-telescope', 'Whitespace', $clickFn, !hasWhitespaceParam()); // hasWhitespaceParam tell us that we should ignore whitespace, so checkmark is inverse
}

function addOneCheckbox($id, $labelSpanClasses, $labelInner, $clickFn, $checked) {
  var $checkedStr = $checked ? 'checked' : '';
  var $checkbox = $('<input type="checkbox" id="' + $id + '" ' + $checkedStr +' class="octosplit-checkbox" />');
  var $label    = $('<label id="' + $id + '-label" for="' + $id + '" class="octosplit-label"><span class="octicon ' + $labelSpanClasses + '"></span><strong>' + $labelInner + '</strong></label>');

  $('#toc .explain').append($label, $checkbox);

  $checkbox.on('click', $clickFn);
}

function watchForPageChanges() {
  var pjaxContainer = $("#js-repo-pjax-container");
  if (pjaxContainer.size() == 0) {
    return;
  }
  var currentToc = $("#toc").get(0);
  var observer = new MutationObserver(function(records) {
    var newToc = $("#toc").get(0);
    if (newToc != currentToc) {
      addAllTheCake();
      currentToc = newToc;
    }
  });
  observer.observe(pjaxContainer.get(0), {childList: true, subtree: true});
}

function manageNewComment() {
  $('#files').on('click', function(event) {
    if (!$('#octosplit').is(':checked')) {
      return;
    }

    $elmt = $(event.target);
    if (!$elmt.hasClass('add-line-comment')) {
      return;
    }

		$(".actually-show").removeClass("actually-show");

		var st = 0;

		setTimeout(function() {

			var $elm = $($elmt.parent().parent().next());

			if (!$elm.hasClass("inline-comment-form") && st < 1000) {
				setTimeout(arguments.callee, 50);
			} else {
				splitInlineComment($elm);
				$elm.addClass("actually-show");
				$elm.find("textarea").val("- [ ] completed").focus();
			}
			st = st + 50;
		}, 100);

  });
}

function manageTabs() {
  $('.tabnav .tabnav-tab', $('.new-pull-request, .view-pull-request')).on('click', function(event) {
    window.setTimeout(function() {
      if (isFilesBucketTab() && $('#octosplit').is(':checked')) {
        enlarge();
      } else {
        shrink();
      }
    }, 100);
  });
}

function enlarge() {
  $('.wrapper .container').addClass('large');
}

function shrink() {
  $('.wrapper .container.large').removeClass('large');
}

function splitDiffs() {
  $('table.file-diff').each(function() {
    if (isSplittable($(this))) {
      $('tbody tr', $(this)).each(function() {
        if ($(this).hasClass('inline-comments')) {
          splitInlineComment($(this));
        } else {
          splitDiffLine($(this))
        }
      });
    }
  })
}

function resetDiffs() {
  $('table.file-diff').each(function() {
    if (isResettable($(this))) {
      $('tbody tr', $(this)).each(function() {
        if ($(this).hasClass('inline-comments')) {
          resetInlineComment($(this));
        } else {
          resetDiffLine($(this))
        }
      });
    }
  })
}

function splitDiffLine($line) {
  var $children = $line.children();

  var $oldNumber = $($children[0]);
  var $newNumber = $($children[1]);
  var $LOC = $($children[2]);

  var $oldLOC = $('<td class="diff-line-code"></td>');
  var $newLOC = $('<td class="diff-line-code"></td>');

  if ($line.hasClass('gd')) {
    $oldLOC.html($LOC.html());
    $newLOC.addClass('nd');
    $newNumber.addClass('nd');
    $newLOC.html('');
  } else if ($line.hasClass('gi')) {
    $oldLOC.html('');
    $newLOC.html($LOC.html());
    $oldLOC.addClass('nd');
    $oldNumber.addClass('nd');
  } else {
    if ($line.hasClass('gc')) {
      $oldLOC.addClass('gc');
      $newLOC.addClass('gc');
    }
    $oldLOC.html($LOC.html());
    $newLOC.html($LOC.html());
  }

  $newNumber.addClass('new-number');

  if($oldLOC.children().first().hasClass('add-bubble')) {
    $oldLOC.children().first().remove();
  }

	$oldLOC.insertAfter($oldNumber);
  $newLOC.insertAfter($newNumber);
  $LOC.remove();
}

function resetDiffLine($line) {
  var $children = $line.children();

  var $oldNumber = $($children[0]);
  var $oldLOC    = $($children[1]);
  var $newNumber = $($children[2]);
  var $newLOC    = $($children[3]);

  if($line.hasClass('gd')) {
    $newLOC.html($oldLOC.html());
  }

  $oldLOC.remove();

  $oldNumber.removeClass('nd');
  $oldNumber.css('border-right', 'none');
  $newNumber.removeClass('nd');
  $newLOC.removeClass('nd');
}

function splitInlineComment($line) {
	if ($line.hasClass("show-inline-comment-form")) {
		$line.next("tr").before($line.detach());
	} else {
		$line.next("tr").after($line.detach());
	}
  $line.children().first().attr('colspan', 1);
  $line.children().last().attr('colspan', 3);
}

function resetInlineComment($line) {
	$line.prev("tr").before($line.detach());
  $line.children().first().attr('colspan', 2);
  $line.children().last().attr('colspan', 1);
}

function isFilesBucketTab() {
  return ($('.tabnav-tab.selected').attr('href') == '#files_bucket') || ($('.tabnav-tab.selected').data().containerId == 'files_bucket');
}

function isSplittable($table) {
  return ($('tr.gd', $table).length && $('tr.gi', $table).length);
}

function isResettable($table) {
  return ($('.new-number', $table).length > 0)
}


function hasWhitespaceParam() {
  return getURLParameter('w') !== null; // Right now w can have any value as long is present gh will remove whitespace
}

function removeWhitespaceParam() {
  document.location = removeParameter(document.location.search, 'w');
}

function addWhitespaceParam() {
  if (!hasWhitespaceParam()) {
    insertParameter('w', '1');
  }
}

// Some Utility methods
// Barely based on http://stackoverflow.com/questions/486896/adding-a-parameter-to-the-url-with-javascript
function insertParameter(key, value) {
  key = encodeURIComponent(key); value = encodeURIComponent(value);

  var s = removeParameter(document.location.search, key); // We remove it in case is there already
  var kvp = key+"="+value;

  s += (s.indexOf('?') !== -1 ? '&' : '?') + kvp;

  document.location.search = s;
}
// Stolen from http://stackoverflow.com/questions/1634748/how-can-i-delete-a-query-string-parameter-in-javascript
function removeParameter(url, parameter) {
  var urlparts= url.split('?');

  if (urlparts.length>=2) {
    var urlBase=urlparts.shift(); //get first part, and remove from array
    var queryString=urlparts.join("?"); //join it back up

    var prefix = encodeURIComponent(parameter)+'=';
    var pars = queryString.split(/[&;]/g);
    if (pars.length > 0) {
      for (var i= pars.length; i-->0;)               //reverse iteration as may be destructive
        if (pars[i].lastIndexOf(prefix, 0)!==-1)   //idiom for string.startsWith
          pars.splice(i, 1);
      url = urlBase+'?'+pars.join('&');
    }
  }
  return url;
}
// From http://stackoverflow.com/questions/1403888/get-url-parameter-with-jquery
function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(document.location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}
