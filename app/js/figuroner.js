/* global TweenMax, Storage */

"use strict";

// Using this later
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// Declaring all variables
var gradeFormSource = '<form class="grade-form row collapse" action="javascript:void(0);">' +
        '<div class="small-6 column">' +
        '<input type="number" class="grade-form-grade-height" placeholder="Cijfer" min="1" max="10" step="0.1"/>' +
        '</div>' +
        '<div class="small-6 columns">' +
        '<div class="row collapse">' +
        '<div class="small-9 column">' +
        '<input type="number" class="grade-form-grade-weight" placeholder="Weging" min="1" max="10"/>' +
        '</div>' +
        '<div class="small-3 column">' +
        '<button type="button" class="postfix columns remove-this-grade warning" title="Verwijderen"><span class="fa fa-remove"></span></button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</form>';

var animationDuration = 0.250;

var gradeInputFormContainer,
        nextGradeWeightInput,
        targetGradeInput,
        overviewGradesTable,
        overviewGradesTableBody,
        overviewNextGradeWeight,
        overviewTargetGrade,
        resultsDesiredGrade,
        resultsDesiredGradeComment,
        footer;

var desiredGrade, grades, nextGradeWeight, targetGrade, maxFinalGradeOnMax;

var initialized = false, previousPageID, currentPageID, currentPage = null, toTween;

// Initialization method
function initialize()
{
    if (typeof (Storage) === "undefined")
    {
        $('body').html('<p>Figuroner kan alleen gebruikt worden als lokale opslag in de browser ingeschakeld is.');
    }

    gradeInputFormContainer = $('#grade-input-form-container');
    nextGradeWeightInput = $('#next-grade-weight-input');
    targetGradeInput = $('#target-grade-input');
    overviewGradesTable = $('#overview-grades-table');
    overviewGradesTableBody = $('#overview-grades-table-body');
    overviewNextGradeWeight = $('#overview-next-grade-weight');
    overviewTargetGrade = $('#overview-target-grade');
    resultsDesiredGrade = $('#results-desired-grade');
    resultsDesiredGradeComment = $('#results-desired-grade-comment');
    footer = $('#footer');

    $('.add-grade').click(addGrade);
    $('.remove-this-grade').click(removeGrade);
    $('.load-data').click(loadSavedLocalData);
    $('.save-data').click(saveData);
    $('.delete-data').click(deleteData);
    $('.back-button').click(backButton);
    $('#enter-grades-complete').click(navigateToTargetGrade);
    $('#enter-target-grade-complete').click(navigateToOverview);
    $('#overview-complete').click(navigateToResults);
    $(window).resize(handleFooter);

    addGrade();
    checkSessionData();
    navigated();
    window.onhashchange = navigated;
    $(document).foundation();

    initialized = true;
}

// Navigation
function navigate(to)
{
    window.history.pushState(null, null, to);
    switchPage(to);
}
function navigated()
{
    var hash = window.location.hash;
    if (hash === '')
    {
        switchPage('#home');
    }
    else
    {
        switchPage(hash);
    }
}
function switchPage(pageID)
{
    var page = $(pageID);
    currentPageID = pageID.substring(1);
    if (currentPage !== null && currentPage.length)
    {
        if (typeof toTween !== 'undefined' && toTween !== null)
        {
            toTween.kill();
        }
        TweenMax.to(currentPage, animationDuration, {display: 'none', opacity: 0, scale: 0.9});
        currentPage = page;
        toTween = TweenMax.to(page, animationDuration, {opacity: 1, display: 'block', delay: animationDuration, onComplete: function ()
            {
                handleFooter();
                window.scrollTo(0, 0);
            }});
        TweenMax.fromTo(page, animationDuration, {scale: 0.9}, {scale: 1, delay: animationDuration});
    }
    else
    {
        currentPage = page;
        toTween = TweenMax.to(page, animationDuration, {display: 'block', delay: animationDuration, onComplete: function ()
            {
                handleFooter();
                window.scrollTo(0, 0);
            }});
        TweenMax.fromTo(page, animationDuration, {scale: 0.9, opacity: 0}, {scale: 1, opacity: 1, delay: animationDuration});
    }
    pageChanged();
}
function pageChanged() {
    switch (currentPageID)
    {
        case 'enter-target-grade':
            if (typeof grades === 'undefined' || grades === null)
            {
                navigate('#enter-grades');
                return;
            }
            break;
        case 'overview':
            createOverview();
            break;
        case 'results':
            if (typeof grades === 'undefined' || grades === null || typeof nextGradeWeight === 'undefined' || nextGradeWeight === null || typeof targetGrade === 'undefined' || targetGrade === null)
            {
                navigate('#enter-grades');
                return;
            }
            createResults();
            break;
    }
    if (localStorage.getItem('grades') === null && localStorage.getItem('nextGradeWeight') === null && localStorage.getItem('targetGrade') === null)
    {
        $('.load-data-container, .load-data, .delete-data-container, .delete-data').hide();
    }
    else
    {
        $('.load-data-container, .load-data, .delete-data-container, .delete-data').show();
    }
    if (currentPageID === 'home')
    {
        TweenMax.to('.back-button', animationDuration, {scale: 0, display: 'none', delay: animationDuration / 2});
    }
    else
    {
        TweenMax.to('.back-button', animationDuration, {scale: 1, display: 'block', delay: animationDuration / 2});
    }
    TweenMax.to('.message', animationDuration, {opacity: 0, scale: 0});
    TweenMax.to('#load-spinner', animationDuration, {scale: 0, display: 'none'});
}
function backButton()
{
    if (currentPageID !== 'home')
        history.back();
}

// Grade calculator
function calculateDesiredGrade()
{
    if (typeof grades === 'undefined' || grades === null || typeof nextGradeWeight === 'undefined' || nextGradeWeight === null || typeof targetGrade === 'undefined' || targetGrade === null)
    {
        navigate('#enter-grades');
        return false;
    }
    var sumGradeHeightTimesWeight = 0, sumGradeWeight = parseInt(nextGradeWeight);
    for (var i = 0; i < grades.length; i++)
    {
        sumGradeHeightTimesWeight += grades[i].height * grades[i].weight;
        sumGradeWeight += parseInt(grades[i].weight);
    }
    desiredGrade = (targetGrade * sumGradeWeight - sumGradeHeightTimesWeight) / nextGradeWeight;
    maxFinalGradeOnMax = (sumGradeHeightTimesWeight + 10 * nextGradeWeight) / sumGradeWeight;
    return true;
}

// Button click handlers
function addGrade()
{
    var newGrade = $(gradeFormSource);
    gradeInputFormContainer.append(newGrade);
    TweenMax.from(newGrade, animationDuration * 2, {scale: 0, opacity: 0});
    newGrade.find('.remove-this-grade').click(removeGrade);
    handleFooter();
}

function removeGrade()
{
    var t = $(this).parents('.grade-form').first();
    TweenMax.to(t, animationDuration * 2, {scale: 0, opacity: 0, onComplete: function () {
            t.remove();
            handleFooter();
        }});
}

// Field parsing and storing
function parseGrades()
{
    var isParseSuccesful = true, gradeForms = gradeInputFormContainer.find('.grade-form');
    grades = [];
    gradeForms.each(function (i, e) {
        var grade = {};
        var gradeForm = $(e);
        var gradeFormGradeHeight = gradeForm.find('.grade-form-grade-height').val(), gradeFormGradeWeight = gradeForm.find('.grade-form-grade-weight').val();
        if (isNumeric(gradeFormGradeHeight) && isNumeric(gradeFormGradeWeight) && gradeFormGradeHeight >= 1 && gradeFormGradeHeight <= 10 && gradeFormGradeWeight >= 1 && gradeFormGradeWeight <= 10)
        {
            grade.height = Math.round(gradeFormGradeHeight * 10) / 10;
            grade.weight = Math.round(gradeFormGradeWeight);
            grades.push(grade);
        }
        else
        {
            isParseSuccesful = false;
        }
    });
    sessionStorage.setItem('grades', JSON.stringify(grades));
    return isParseSuccesful;
}

function navigateToTargetGrade()
{
    var canContinue = true, gradeInputFormContainerChildren = gradeInputFormContainer.children('form');
    canContinue &= gradeInputFormContainerChildren.length > 0;
    canContinue &= parseGrades();
    if (!canContinue)
    {
        navigate('#entered-grades-incorrect');
    }
    else
    {
        navigate('#enter-target-grade');
    }
}

// View creation and UI handling
function createEnterGradesFromData()
{
    var gradeInputFormContainerChildren = gradeInputFormContainer.children();
    if (initialized)
    {
        TweenMax.to(gradeInputFormContainerChildren, animationDuration * 2, {scale: 0, opacity: 0, onComplete: function () {
                gradeInputFormContainerChildren.remove();
            }});
    }
    else
    {
        gradeInputFormContainerChildren.remove();
    }
    for (var i = 0; i < grades.length; i++)
    {
        var newGrade = $(gradeFormSource);
        newGrade.find('.grade-form-grade-height').val(grades[i].height);
        newGrade.find('.grade-form-grade-weight').val(grades[i].weight);
        gradeInputFormContainer.append(newGrade);
        TweenMax.from(newGrade, animationDuration * 2, {scale: 0, opacity: 0});
        newGrade.find('.remove-this-grade').click(removeGrade);
    }
    nextGradeWeightInput.val(nextGradeWeight);
    targetGradeInput.val(targetGrade);
}
function createOverview()
{
    if (typeof grades === 'undefined' || grades === null || typeof nextGradeWeight === 'undefined' || nextGradeWeight === null || typeof targetGrade === 'undefined' || targetGrade === null)
    {
        navigate('#enter-grades');
        return;
    }
    overviewGradesTableBody.empty();
    for (var i = 0; i < grades.length; i++)
    {
        overviewGradesTableBody.append('<tr><td>' + grades[i].height + '</td><td>' + grades[i].weight + '</td></tr>');
    }
    overviewNextGradeWeight.html(nextGradeWeight);
    overviewTargetGrade.html(targetGrade);
}
function createResults()
{
    if (calculateDesiredGrade())
    {
        var roundedMaxFinalGradeOnMax = Math.round(maxFinalGradeOnMax * 10) / 10;
        if (desiredGrade > 10)
        {
            resultsDesiredGrade.css('color', '#ff0000');
            resultsDesiredGradeComment.html('Het streefcijfer is niet meer te behalen omdat het berekende cijfer hoger is dan een tien. Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else if (desiredGrade >= 8)
        {
            resultsDesiredGrade.css('color', '#ff8000');
            resultsDesiredGradeComment.html('Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else if (desiredGrade >= 6)
        {
            resultsDesiredGrade.css('color', '#008000');
            resultsDesiredGradeComment.html('Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else if (desiredGrade >= 4)
        {
            resultsDesiredGrade.css('color', '#00F000');
            resultsDesiredGradeComment.html('Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else if (desiredGrade >= 2)
        {
            resultsDesiredGrade.css('color', '#0080FF');
            resultsDesiredGradeComment.html('Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else if (desiredGrade >= 1)
        {
            resultsDesiredGrade.css('color', '#4444FF');
            resultsDesiredGradeComment.html('Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else if (desiredGrade < 1)
        {
            resultsDesiredGrade.css('color', '#FF00AA');
            resultsDesiredGradeComment.html('Je gemiddelde cijfer zal boven het streefcijfer uitkomen, omdat het benodigde cijfer lager is dan een één. Het hoogste gemiddelde cijfer dat je kunt halen met een tien is <b>' + roundedMaxFinalGradeOnMax + '</b>.');
        }
        else
        {
            resultsDesiredGrade.css('color', '#333333');
            resultsDesiredGradeComment.html('');
        }
        resultsDesiredGrade.html(Math.ceil(desiredGrade * 10) / 10);
        TweenMax.from(resultsDesiredGrade, animationDuration * 2, {scale: 0, opacity: 0, delay: animationDuration * 2});
        TweenMax.from(resultsDesiredGradeComment, animationDuration * 4, {opacity: 0, delay: animationDuration * 3});
    }
}

function navigateToOverview()
{
    var canContinue = true;
    var nextGradeWeightValue = nextGradeWeightInput.val();
    if (isNumeric(nextGradeWeightValue) && nextGradeWeightValue >= 1 && nextGradeWeightValue <= 10)
    {
        nextGradeWeight = Math.round(nextGradeWeightValue * 10) / 10;
        sessionStorage.setItem('nextGradeWeight', nextGradeWeight);
    }
    else
    {
        canContinue = false;
    }
    var targetGradeValue = targetGradeInput.val();
    if (isNumeric(targetGradeValue) && targetGradeValue >= 1 && targetGradeValue <= 10)
    {
        targetGrade = Math.round(targetGradeValue * 10) / 10;
        sessionStorage.setItem('targetGrade', targetGrade);
    }
    else
    {
        canContinue = false;
    }
    if (!canContinue)
    {
        navigate('#entered-target-grade-incorrect');
    }
    else
    {
        navigate('#overview');
    }
}

function navigateToResults()
{
    navigate('#results');
}

function handleFooter()
{
    if (typeof footer !== 'undefined' && footer !== null && typeof currentPage !== 'undefined' && currentPage !== null)
    {
        var currentFooterTop = footer.position().top;
        var maxBottom = currentPage.position().top + currentPage.outerHeight(true) + footer.outerHeight(), windowHeight = $(window).height();
        if (windowHeight > maxBottom)
        {
            if (!footer.hasClass('fixed-footer'))
            {
                footer.addClass('fixed-footer');
                TweenMax.from(footer, animationDuration, {y: currentFooterTop - footer.position().top});
            }
        }
        if (windowHeight < maxBottom)
        {
            if (footer.hasClass('fixed-footer'))
            {
                footer.removeClass('fixed-footer');
                TweenMax.from(footer, animationDuration, {y: currentFooterTop - footer.position().top});
            }
        }
    }
}

// Data storage
function saveData()
{
    if (typeof grades === 'undefined' || typeof nextGradeWeight === 'undefined' || typeof targetGrade === 'undefined')
    {
        navigate('#enter-grades');
        return;
    }
    var gradesAsString = JSON.stringify(grades);
    localStorage.setItem("grades", gradesAsString);
    localStorage.setItem('nextGradeWeight', nextGradeWeight);
    localStorage.setItem('targetGrade', targetGrade);
    TweenMax.to('.message.data-saved', animationDuration, {opacity: 1, scale: 1});
}

function loadSavedLocalData()
{
    var loadedData = false;
    var savedGradesJson = localStorage.getItem('grades');
    if (savedGradesJson !== null && savedGradesJson.length > 0)
    {
        var savedGrades = JSON.parse(savedGradesJson);
        grades = savedGrades;
        loadedData = true;
    }
    var savedNextGradeWeight = localStorage.getItem('nextGradeWeight');
    if (savedNextGradeWeight !== null && isNumeric(savedNextGradeWeight))
    {
        nextGradeWeight = savedNextGradeWeight;
        loadedData = true;
    }
    var savedTargetGrade = localStorage.getItem('targetGrade');
    if (savedNextGradeWeight !== null && isNumeric(savedTargetGrade))
    {
        targetGrade = savedTargetGrade;
        loadedData = true;
    }
    if (loadedData)
        createEnterGradesFromData();
    TweenMax.to('.message.data-loaded', animationDuration, {opacity: 1, scale: 1});
}

function deleteData()
{
    localStorage.clear();
    sessionStorage.clear();
    checkSessionData();
    TweenMax.to('.message.data-deleted', animationDuration, {opacity: 1, scale: 1});
}

function checkSessionData()
{
    var loadedData = false;
    var sessionGrades = sessionStorage.getItem('grades');
    if ((typeof grades === 'undefined' || grades === null) && (typeof sessionGrades !== 'undefined' && sessionGrades !== null))
    {
        grades = JSON.parse(sessionGrades);
        loadedData = true;
    }
    var sessionNextGradeWeight = sessionStorage.getItem('nextGradeWeight');
    if ((typeof nextGradeWeight === 'undefined' || nextGradeWeight === null) && (typeof sessionNextGradeWeight !== 'undefined' && sessionNextGradeWeight !== null))
    {
        nextGradeWeight = JSON.parse(sessionNextGradeWeight);
        loadedData = true;
    }
    var sessionTargetGrade = sessionStorage.getItem('targetGrade');
    if ((typeof targetGrade === 'undefined' || targetGrade === null) && (typeof sessionTargetGrade !== 'undefined' && sessionTargetGrade !== null))
    {
        targetGrade = JSON.parse(sessionTargetGrade);
        loadedData = true;
    }
    if (loadedData)
    {
        createEnterGradesFromData();
    }
}

// Final initialization call
$(document).ready(function ()
{
    initialize();
}
);

    