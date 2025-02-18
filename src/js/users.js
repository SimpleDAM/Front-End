/*
This software is released under the BSD-3-Clause License

Copyright 2025 Daydream Interactive Limited

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Page globals
var currentuserid = null;
var perpage = getParameterByName("num",20);
var numrecords = 0;
var page = getParameterByName("page",1);
var maxpages = 0;
var maxpagelinks = 11;
/*
var sortpair = getParameterByName("sort","userid asc");
var sortarray = sortpair.split(" ");
var sortby = sortarray[0];
var dir = sortarray[1];
*/
var sort = getParameterByName("sort","userid");
var dir = getParameterByName("dir","asc");
var sortpair = sort + " " + dir;

var q = getParameterByName("q","");
var r = getParameterByName("r","");
var sessiontoken = localStorage.sessiontoken;

$(document).ready(function(){
	// Check session token on page load and redirect to login if a valid one isn't found
	checkSessionToken().then(
		function(data){
			if (data.error || data.data.userroleid < 2){
				window.location.href = "/";
			} else {
				init(data);
			}
		}
	).fail(function(){
		window.location.href = "/";
	});
	
});

function init(userdata){

	$(".logged-in, .main-container").fadeIn();
	$(".isadmin").show();
	$("#sessiontoken").val(sessiontoken);
	
	// Append logout link with sessiontoken
	$(".logout").attr("href","/api/user/logout/?sessiontoken="+userdata.data.sessiontoken);
	
	$("#add_user_form").on("submit",function (event) {
	
		$(".errors").hide();
		$(".user-added").hide();
		
		var formData = $(this).serializeArray();
		
		$.ajax({
			type: "POST",
			url: $(this).prop("action"),
			data: formData,
			dataType: "json",
			encode: true,
		}).done(function (json) {
			if (json.error){
				showError(json.description,true);
			} else {
				showSuccess('The user was successfully created! <a href="/admin/users">Reload the page</a>.');
				$("#add_user_form").trigger("reset");
			}
		});
		
		event.preventDefault();
	});	
	
	// Dropdown per page handler
	$("#per_page_select").on("change",function(){
		var num = $(this).val();
		$.cookie('perpage_users', num, {path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie});
		window.location.href = "?num="+num;
	});
	
	if ($.cookie('perpage_users')){
		perpage = $.cookie('perpage_users');
	}
	
	$("#per_page_select").val(perpage);

	
	// Hide/show filters
	$(document).on("click",".toggleSearchFilters",function(){
		console.log("Toggle filters");
		$(".searchFilters").toggle(250,function(){
			if ($(".searchFilters").is(':visible')){
				$.removeCookie('hideUserFilters', {path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie});
				$(".toggleSearchFilters").html("Hide Filters [&minus;]");
			} else {
				$.cookie('hideUserFilters', 'true', { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$(".toggleSearchFilters").html("Show Filters [+]");
			}
		});
		return false;
	});
	
	// Hide/Show create new user
	$(document).on("click",".addNewUser",function(){
		$(".userFormWrapper").toggle(250,function(){
			if ($(".userFormWrapper").is(':visible')){
				$(".addNewUser").html("Add New User [&minus;]");
			} else {
				$(".addNewUser").html("Add New User [+]");
			}
		});
		return false;
	});
	
	// On load, if filters were previously hidden, hide them
	// BUT, if form was explicitly reset re-open the form
	$(document).on("click","#filterReset",function(){	
		$("#userq").val("");
		$("#r").val("");
	});
	// On load, if filters were previously hidden, hide them
	// BUT, if form was explicitly reset re-open the form
	if (getParameterByName("reset")){
		$.removeCookie('hideUserFilters', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('userq', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$.removeCookie('r', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		history.pushState('', document.title, window.location.pathname);
	}
	
	// Keyword present in querystring?
	if (getParameterByName("q")){
		$.cookie('userq', getParameterByName("q"), { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
		$("#userq").val(getParameterByName("q"));
	// Else was an empty parameter sent?
	} else if (urlParameterExists("q")){
		$("#userq").val("");
		$.removeCookie('userq', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
	// Else does the keyword cookie exist?	
	} else if ($.cookie('userq')){
		$("#userq").val($.cookie('userq'));
	}
	
	q = $("#userq").val();
	
	if ($.cookie('r')){
		r = $.cookie('r');
	}

	if ($.cookie('hideUserFilters')){
		$(".searchFilters").hide();
		$(".toggleSearchFilters").html("Show Filters [+]");
	}
	
	$(function(){
      $(".footer").load("/html/footer.html"); 
    });
	
	// Get user roles - this in turn calls getUsers
	getUserRoles();
	
}

function getUserRoles(){

	$.getJSON("/api/userrole/list/",{sessiontoken:sessiontoken,start:0, limit:5, sort:"userroleid", dir:"asc"})
	.done(function(json) {
		if (json.error){
			showError(json.error,true);
		} else {		
			var roles = json.data.userroles;
			// Build the HTML and add to the table
			for(i in roles){	
				$("#userroleid").append('<option value="'+roles[i].userroleid+'">'+roles[i].userrolename+'</option>');
				$("#r").append('<option value="'+roles[i].userroleid+'">'+roles[i].userrolename+'</option>');
			}
			
			// User role dropdown
			if (getParameterByName("r")){
				$.cookie('r', getParameterByName("r"), { expires: 365, path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
				$("#r").val(getParameterByName("r")).trigger("change");
			// Else was an empty parameter sent?
			}else if (urlParameterExists("r")){
				$("#r").val("");
				$.removeCookie('r', { path: '/;SameSite='+samesite, domain: COOKIEDOMAIN, secure: httpscookie });
			// Else does the r cookie exist?	
			} else if ($.cookie('r')){
				$("#r").val($.cookie('r')).trigger("change");
			}
			r = $("#r").val();
			
			getUsers();
			
		}
	})
	.fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		showError(err,true);
	}); // end getJSON
}

function getUsers(){
	
	$(".error-msg").html("");
	$(".errors").hide();
	
	var start = (page > 1) ? (page - 1) * perpage : 0;
	
	$.getJSON("/api/user/list/",{sessiontoken:sessiontoken,start:start, limit:perpage, sort:sort, dir:dir, r:r, q:q})
	.done(function(json) {
		if (json.error){
			showError(json.description,true);
		} else {
			
			$(".user-row").remove();
			var users = json.data.users;
			// Work out pagination
			numrecords = json.data.total;
			maxpages = Math.ceil(numrecords/perpage);
			
			// Prevent pages going out of range
			if (maxpages > 0 && page > maxpages){
				page = maxpages;
				getUsers();
				return false;
			}
			
			$(".numrecords").html(numrecords);
			$(".current-page").html(page);
			$(".max-pages").html(maxpages);
			//updatePagination();
			buildPagination();
			var html = '';
			// Build the HTML and add to the table
			for(i in users){			
				html += '<tr class="user-row"><td>'+users[i].userid+'</td><td><a href="/account?userid='+users[i].userid+'">'+users[i].firstname+'</a></td><td><a href="/account?userid='+users[i].userid+'">'+users[i].lastname+'</a></td><td><a href="mailto:'+users[i].email+'">'+users[i].email+'</a></td><td>'+users[i].userrolename+'</td><td>'+users[i].lastlogindate+'</td><td>'+users[i].datecreated+'</td><td>'+users[i].datemodified+'</td><td><a class="btn btn-xs btn-primary" href="/account?userid='+users[i].userid+'">Edit</a></td></tr>';			
			}
			$(".userTable tbody").append(html);
		}
	})
	.fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		showError(err,true);
	}); // end getJSON
}