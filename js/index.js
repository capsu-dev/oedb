var sectionChanger = document.querySelector('.section-changer');
var startSurveyButton = document.querySelector('.start_survey');
var ccLoadPending = false;
var sqdLoadPending = false;
var remarksLoadPending = false;
var activeSection = null;
var sectionHistory = [];
var forwardSections = [];
var surveyConfig = null;

function animateSection(direction) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sectionChanger.animate) {
        return;
    }

    sectionChanger.animate(
        [
            { opacity: 0, transform: 'translateX(' + (direction === 'back' ? '-1.5rem' : '1.5rem') + ')' },
            { opacity: 1, transform: 'translateX(0)' }
        ],
        { duration: 350, easing: 'ease-out' }
    );
}

function captureControlValues() {
    return Array.prototype.map.call(
        sectionChanger.querySelectorAll('input, select, textarea'),
        function (control) {
            return {
                value: control.value,
                checked: 'checked' in control ? control.checked : undefined
            };
        }
    );
}

function restoreControlValues(values) {
    var controls = sectionChanger.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(controls, function (control, index) {
        if (!values[index]) {
            return;
        }

        control.value = values[index].value;
        if (values[index].checked !== undefined) {
            control.checked = values[index].checked;
        }
    });
}

function startQuestionAdvanceTimer(indicator, progressBar, onComplete) {
    var duration = surveyConfig.settings.autoAdvanceDurationMs;
    var startedAt = Date.now();

    function stop() {
        window.clearInterval(interval);
        indicator.classList.add('d-none');
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
    }

    function updateProgress() {
        var percentage = Math.min(((Date.now() - startedAt) / duration) * 100, 100);
        var roundedPercentage = Math.floor(percentage);
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', String(roundedPercentage));

        if (percentage >= 100) {
            stop();
            onComplete();
        }
    }

    indicator.classList.remove('d-none');
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');

    var interval = window.setInterval(updateProgress, 50);
    return stop;
}

function initializeSection(stage) {
    if (stage === 'basicinfo') {
        initializeBasicInfo();
    } else if (stage === 'cc') {
        initializeCC();
    } else if (stage === 'sqd') {
        initializeSQD();
    } else if (stage === 'remarks') {
        initializeRemarks();
    } else {
        console.error('Cannot initialize unknown survey section: ' + stage);
    }
}

function showSection(html, stage, direction) {
    if (activeSection !== null) {
        var currentNextButton = sectionChanger.querySelector('#basic-info-next, #cc-next, #sqd-next');
        if (currentNextButton) {
            currentNextButton.disabled = false;
        }

        sectionHistory.push({
            stage: activeSection,
            html: sectionChanger.innerHTML,
            values: captureControlValues()
        });
    }

    var cachedSection = forwardSections.length > 0
        ? forwardSections[forwardSections.length - 1]
        : null;
    if (cachedSection && cachedSection.stage === stage) {
        forwardSections.pop();
        html = cachedSection.html;
    } else {
        forwardSections = [];
    }

    sectionChanger.innerHTML = html;
    activeSection = stage;
    if (cachedSection && cachedSection.stage === stage) {
        restoreControlValues(cachedSection.values);
    }
    initializeSection(stage);
    animateSection(direction);
}

function navigateToPreviousSection() {
    if (activeSection !== null) {
        forwardSections.push({
            stage: activeSection,
            html: sectionChanger.innerHTML,
            values: captureControlValues()
        });
    }

    var previousSection = sectionHistory.pop();
    if (!previousSection) {
        forwardSections.pop();
        return;
    }

    sectionChanger.innerHTML = previousSection.html;
    activeSection = previousSection.stage;
    restoreControlValues(previousSection.values);
    initializeSection(previousSection.stage);
    animateSection('back');
}

function showLoadError(message) {
    console.error(message);
    if (!sectionChanger) {
        return;
    }

    var errorMessage = sectionChanger.querySelector('.survey-load-error');
    if (!errorMessage) {
        errorMessage = document.createElement('div');
    }
    errorMessage.className = 'alert alert-danger mt-3';
    errorMessage.classList.add('survey-load-error');
    errorMessage.setAttribute('role', 'alert');
    errorMessage.textContent = surveyConfig
        ? surveyConfig.text.loadError
        : 'The survey could not be loaded. Please try again.';
    if (!errorMessage.parentNode) {
        sectionChanger.appendChild(errorMessage);
    }
}

function loadCCSection(onError) {
    if (ccLoadPending) {
        return;
    }

    ccLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            ccLoadPending = false;
            showLoadError('Unable to load cc.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        ccLoadPending = false;
        showSection(request.responseText, 'cc', 'forward');
    };
    request.onerror = function () {
        ccLoadPending = false;
        showLoadError('A network error occurred while loading cc.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/cc.html', true);
    request.send();
}

function loadSQDSection(onError) {
    if (sqdLoadPending) {
        return;
    }

    sqdLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            sqdLoadPending = false;
            showLoadError('Unable to load sqd.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        sqdLoadPending = false;
        showSection(request.responseText, 'sqd', 'forward');
    };
    request.onerror = function () {
        sqdLoadPending = false;
        showLoadError('A network error occurred while loading sqd.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/sqd.html', true);
    request.send();
}

function loadRemarksSection(onError) {
    if (remarksLoadPending) {
        return;
    }

    remarksLoadPending = true;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            remarksLoadPending = false;
            showLoadError('Unable to load remarks.html. HTTP status: ' + request.status);
            if (onError) {
                onError();
            }
            return;
        }

        remarksLoadPending = false;
        showSection(request.responseText, 'remarks', 'forward');
    };
    request.onerror = function () {
        remarksLoadPending = false;
        showLoadError('A network error occurred while loading remarks.html.');
        if (onError) {
            onError();
        }
    };

    request.open('GET', 'content/remarks.html', true);
    request.send();
}

function initializeBasicInfo() {
    var carouselElement = document.getElementById('basic-info-carousel');
    var form = document.getElementById('basic-info-form');
    var previousButton = document.getElementById('basic-info-previous');
    var nextButton = document.getElementById('basic-info-next');
    var progress = document.getElementById('basic-info-progress');
    var stepLabel = document.getElementById('basic-info-step-label');
    var agencySelect = document.getElementById('agency');
    var serviceSelect = document.getElementById('service');
    var serviceOtherInput = document.getElementById('service-other');
    var serviceOtherModalElement = document.getElementById('service-other-modal');
    var serviceOtherSaveButton = document.getElementById('service-other-save');

    if (!carouselElement || !form || !previousButton || !nextButton || !progress || !stepLabel ||
        !agencySelect || !serviceSelect || !serviceOtherInput || !serviceOtherModalElement || !serviceOtherSaveButton) {
        console.error('The basic information form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 2) {
        console.error('The basic information carousel must contain exactly two grouped steps.');
        return;
    }
    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var nextButtonMarkup = nextButton.innerHTML;
    var text = surveyConfig.text;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: true,
        wrap: false
    });
    var serviceOtherModal = new bootstrap.Modal(serviceOtherModalElement);
    var serviceCatalogs = surveyConfig.serviceCatalogs;
    var officeServiceCatalogs = surveyConfig.officeServiceCatalogs;

    function setServicePlaceholder(label) {
        serviceSelect.innerHTML = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = label;
        serviceSelect.appendChild(placeholder);
    }

    function renderServiceOptions(resetSelection) {
        var selectedService = resetSelection ? '' : serviceSelect.value;
        if (!agencySelect.value) {
            setServicePlaceholder(text.serviceSelectOfficePrompt);
            serviceSelect.disabled = true;
            return;
        }

        var catalogName = officeServiceCatalogs[agencySelect.value];
        var services = serviceCatalogs[catalogName];
        if (!services) {
            console.error('No service catalog is configured for office: ' + agencySelect.value);
            services = serviceCatalogs.otherOffice;
        }

        setServicePlaceholder(text.serviceSelectPrompt);
        serviceSelect.disabled = false;
        services.forEach(function (service) {
            var option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            serviceSelect.appendChild(option);
        });

        var otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = text.otherServiceOption;
        serviceSelect.appendChild(otherOption);

        if (selectedService && Array.prototype.some.call(serviceSelect.options, function (option) {
            return option.value === selectedService;
        })) {
            serviceSelect.value = selectedService;
        }
    }

    renderServiceOptions(false);

    agencySelect.addEventListener('change', function () {
        renderServiceOptions(true);
        serviceOtherInput.value = '';
        serviceOtherInput.required = false;
        serviceOtherInput.setCustomValidity('');
    });

    function showServiceOtherModal() {
        serviceOtherInput.required = true;
        serviceOtherModal.show();
    }

    serviceSelect.addEventListener('change', function () {
        if (serviceSelect.value === 'other') {
            showServiceOtherModal();
        } else {
            serviceOtherInput.required = false;
            serviceOtherInput.setCustomValidity('');
        }
    });

    serviceOtherInput.addEventListener('input', function () {
        serviceOtherInput.setCustomValidity('');
    });

    serviceOtherSaveButton.addEventListener('click', function () {
        if (!serviceOtherInput.value.trim()) {
            serviceOtherInput.setCustomValidity(text.otherServiceRequired);
            serviceOtherInput.reportValidity();
            return;
        }

        serviceOtherInput.setCustomValidity('');
        serviceOtherModal.hide();
    });

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Step ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = currentIndex === 0;
        nextButton.innerHTML = currentIndex === steps.length - 1
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    function validateCurrentStep() {
        var requiredFields = steps[currentIndex].querySelectorAll('input[required], select[required], textarea[required]');
        for (var i = 0; i < requiredFields.length; i++) {
            if (!requiredFields[i].checkValidity()) {
                requiredFields[i].reportValidity();
                return false;
            }
        }

        if (serviceSelect.value === 'other' && !serviceOtherInput.value.trim()) {
            showServiceOtherModal();
            return false;
        }

        return true;
    }

    carouselElement.addEventListener('slide.bs.carousel', function (event) {
        if (event.to > event.from && !validateCurrentStep()) {
            event.preventDefault();
            return;
        }

        previousButton.disabled = true;
        nextButton.disabled = true;
    });

    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        if (!validateCurrentStep()) {
            return;
        }

        if (currentIndex === steps.length - 1) {
            nextButton.disabled = true;
            loadCCSection(function () {
                nextButton.disabled = false;
            });
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        if (currentIndex === 0) {
            return;
        }

        carousel.prev();
    });

    updateControls();
}

function initializeCC() {
    var carouselElement = document.getElementById('cc-carousel');
    var previousButton = document.getElementById('cc-previous');
    var nextButton = document.getElementById('cc-next');
    var progress = document.getElementById('cc-progress');
    var stepLabel = document.getElementById('cc-step-label');
    var reasonInput = document.getElementById('cc3-reason');
    var reasonModalElement = document.getElementById('cc3-reason-modal');
    var reasonSaveButton = document.getElementById('cc3-reason-save');
    var advanceIndicator = document.getElementById('cc-auto-advance');
    var advanceProgress = document.getElementById('cc-auto-advance-progress');

    if (!carouselElement || !previousButton || !nextButton || !progress || !stepLabel ||
        !reasonInput || !reasonModalElement || !reasonSaveButton || !advanceIndicator || !advanceProgress) {
        console.error('The Citizen Charter form is missing required survey controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 3) {
        console.error('The Citizen Charter carousel must contain exactly three questions.');
        return;
    }

    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }

    var nextButtonMarkup = nextButton.innerHTML;
    var cancelAdvanceTimer = null;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });
    var reasonModal = new bootstrap.Modal(reasonModalElement);

    function getAnswer(name) {
        var selectedAnswer = carouselElement.querySelector('input[name="' + name + '"]:checked');
        return selectedAnswer ? selectedAnswer.value : '';
    }

    function finishesCurrentQuestion() {
        return currentIndex === 2 ||
            (currentIndex === 0 && getAnswer('cc1') === 'not-aware') ||
            (currentIndex === 1 && getAnswer('cc2') === 'not-seen');
    }

    function finishCC() {
        nextButton.disabled = true;
        loadSQDSection(function () {
            nextButton.disabled = false;
        });
    }

    function clearAdvanceTimer() {
        if (cancelAdvanceTimer !== null) {
            cancelAdvanceTimer();
            cancelAdvanceTimer = null;
        }
    }

    function scheduleAdvance() {
        clearAdvanceTimer();
        cancelAdvanceTimer = startQuestionAdvanceTimer(advanceIndicator, advanceProgress, function () {
            cancelAdvanceTimer = null;
            nextButton.click();
        });
    }

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = false;
        nextButton.innerHTML = finishesCurrentQuestion()
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    carouselElement.addEventListener('change', function (event) {
        if (!event.target.matches('input[type="radio"]') || !steps[currentIndex].contains(event.target)) {
            return;
        }

        updateControls();
        scheduleAdvance();
    });
    carouselElement.addEventListener('slide.bs.carousel', function () {
        clearAdvanceTimer();
        previousButton.disabled = true;
        nextButton.disabled = true;
    });
    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = false;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        clearAdvanceTimer();
        var field = steps[currentIndex].querySelector('input[type="radio"]');
        if (!field) {
            console.error('The current Citizen Charter step has no answer field.');
            return;
        }

        if (!field.checkValidity()) {
            field.reportValidity();
            return;
        }

        if (currentIndex === 2 && getAnswer('cc3') === 'not-used') {
            reasonModal.show();
            return;
        }

        if (finishesCurrentQuestion()) {
            finishCC();
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        clearAdvanceTimer();
        if (currentIndex === 0) {
            navigateToPreviousSection();
            return;
        }

        carousel.prev();
    });

    reasonInput.addEventListener('input', function () {
        reasonInput.setCustomValidity('');
    });

    reasonSaveButton.addEventListener('click', function () {
        if (!reasonInput.value.trim()) {
            reasonInput.setCustomValidity(surveyConfig.text.ccReasonRequired);
            reasonInput.reportValidity();
            return;
        }

        reasonInput.setCustomValidity('');
        reasonModalElement.addEventListener('hidden.bs.modal', finishCC, { once: true });
        reasonModal.hide();
    });

    updateControls();
}

function initializeSQD() {
    var carouselElement = document.getElementById('sqd-carousel');
    var previousButton = document.getElementById('sqd-previous');
    var nextButton = document.getElementById('sqd-next');
    var progress = document.getElementById('sqd-progress');
    var stepLabel = document.getElementById('sqd-step-label');

    if (!carouselElement || !previousButton || !nextButton || !progress || !stepLabel) {
        console.error('The service quality survey is missing required controls.');
        return;
    }

    var steps = Array.prototype.slice.call(carouselElement.querySelectorAll('.carousel-item'));
    if (steps.length !== 8) {
        console.error('The service quality survey must contain exactly eight questions.');
        return;
    }

    var currentIndex = steps.findIndex(function (step) {
        return step.classList.contains('active');
    });
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    var nextButtonMarkup = nextButton.innerHTML;
    var advanceIndicator = document.getElementById('sqd-auto-advance');
    var advanceProgress = document.getElementById('sqd-auto-advance-progress');
    if (!advanceIndicator || !advanceProgress) {
        console.error('The service quality survey is missing its auto-advance indicator.');
        return;
    }

    var cancelAdvanceTimer = null;
    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    function clearAdvanceTimer() {
        if (cancelAdvanceTimer !== null) {
            cancelAdvanceTimer();
            cancelAdvanceTimer = null;
        }
    }

    function scheduleAdvance() {
        clearAdvanceTimer();
        cancelAdvanceTimer = startQuestionAdvanceTimer(advanceIndicator, advanceProgress, function () {
            cancelAdvanceTimer = null;
            nextButton.click();
        });
    }

    function updateControls() {
        progress.textContent = (currentIndex + 1) + ' of ' + steps.length;
        stepLabel.textContent = 'Question ' + (currentIndex + 1) + ' of ' + steps.length;
        previousButton.disabled = false;
        nextButton.innerHTML = currentIndex === steps.length - 1
            ? 'Finish <i class="bi bi-check-lg ms-1" aria-hidden="true"></i>'
            : nextButtonMarkup;
    }

    carouselElement.addEventListener('change', function (event) {
        if (!event.target.matches('input[type="radio"]') || !steps[currentIndex].contains(event.target)) {
            return;
        }

        scheduleAdvance();
    });
    carouselElement.addEventListener('slide.bs.carousel', function () {
        clearAdvanceTimer();
        previousButton.disabled = true;
        nextButton.disabled = true;
    });

    carouselElement.addEventListener('slid.bs.carousel', function (event) {
        currentIndex = event.to;
        previousButton.disabled = false;
        nextButton.disabled = false;
        updateControls();
    });

    nextButton.addEventListener('click', function () {
        clearAdvanceTimer();
        var firstChoice = steps[currentIndex].querySelector('input[type="radio"]');
        if (!firstChoice) {
            console.error('The current service quality question has no answer choices.');
            return;
        }

        if (!firstChoice.checkValidity()) {
            firstChoice.reportValidity();
            return;
        }

        if (currentIndex === steps.length - 1) {
            nextButton.disabled = true;
            loadRemarksSection(function () {
                nextButton.disabled = false;
            });
            return;
        }

        carousel.next();
    });

    previousButton.addEventListener('click', function () {
        clearAdvanceTimer();
        if (currentIndex === 0) {
            navigateToPreviousSection();
            return;
        }

        carousel.prev();
    });

    updateControls();
}

function initializeRemarks() {
    var carouselElement = document.getElementById('remarks-carousel');
    var form = document.getElementById('remarks-form');
    var backButton = document.getElementById('remarks-back');

    if (!carouselElement || !form || !backButton) {
        console.error('The remarks section is missing its form or thank-you screen.');
        return;
    }

    var slides = carouselElement.querySelectorAll('.carousel-item');
    if (slides.length !== 2) {
        console.error('The remarks carousel must contain a form and a thank-you screen.');
        return;
    }

    var carousel = new bootstrap.Carousel(carouselElement, {
        interval: false,
        keyboard: false,
        touch: false,
        wrap: false
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        carousel.next();
    });

    var backToSQDButton = document.getElementById('remarks-back-to-sqd');
    if (!backToSQDButton) {
        console.error('The remarks form is missing its back-to-SQD button.');
        return;
    }

    backToSQDButton.addEventListener('click', navigateToPreviousSection);

    backButton.addEventListener('click', function () {
        carousel.prev();
    });
}

function loadSurveyConfig(onSuccess, onFailure) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            onFailure('Unable to load config/survey-config.json. HTTP status: ' + request.status);
            return;
        }

        var config;
        try {
            config = JSON.parse(request.responseText);
        } catch (error) {
            onFailure('The survey configuration is not valid JSON: ' + error.message);
            return;
        }

        var catalogs = config && config.serviceCatalogs;
        var catalogNames = catalogs ? Object.keys(catalogs) : [];
        var hasValidCatalogs = catalogNames.length > 0 && catalogNames.every(function (name) {
            return Array.isArray(catalogs[name]) && catalogs[name].every(function (service) {
                return typeof service === 'string';
            });
        });
        var settings = config && config.settings;
        var text = config && config.text;
        var hasValidText = text && [
            'serviceSelectOfficePrompt',
            'serviceSelectPrompt',
            'otherServiceOption',
            'otherServiceRequired',
            'ccReasonRequired',
            'loadError'
        ].every(function (key) {
            return typeof text[key] === 'string';
        });

        if (!hasValidCatalogs || !catalogs.otherOffice ||
            !config.officeServiceCatalogs || typeof config.officeServiceCatalogs !== 'object' ||
            !settings || typeof settings !== 'object' ||
            typeof settings.autoAdvanceDurationMs !== 'number' ||
            !isFinite(settings.autoAdvanceDurationMs) || settings.autoAdvanceDurationMs <= 0 ||
            !hasValidText) {
            onFailure('The survey configuration is missing valid catalogs, text, or settings.');
            return;
        }

        surveyConfig = config;
        onSuccess();
    };
    request.onerror = function () {
        onFailure('A network error occurred while loading config/survey-config.json.');
    };

    request.open('GET', 'config/survey-config.json', true);
    request.send();
}

if (!sectionChanger || !startSurveyButton) {
    console.error('The survey start button or content container could not be found.');
} else {
    var isLoading = false;

    startSurveyButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (isLoading) {
            return;
        }

        isLoading = true;
        startSurveyButton.classList.add('disabled');
        startSurveyButton.setAttribute('aria-disabled', 'true');

        var failureHandled = false;

        function resetStartButton() {
            isLoading = false;
            startSurveyButton.classList.remove('disabled');
            startSurveyButton.removeAttribute('aria-disabled');
        }

        function handleLoadFailure(message) {
            if (failureHandled) {
                return;
            }

            failureHandled = true;
            resetStartButton();
            showLoadError(message);
        }

        function loadBasicInfo() {
            var request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState !== XMLHttpRequest.DONE) {
                    return;
                }

                if (request.status !== 200) {
                    handleLoadFailure('Unable to load basicinfo.html. HTTP status: ' + request.status);
                    return;
                }

                sectionChanger.innerHTML = request.responseText;
                activeSection = 'basicinfo';
                initializeBasicInfo();
            };
            request.onerror = function () {
                handleLoadFailure('A network error occurred while loading basicinfo.html.');
            };

            request.open('GET', 'content/basicinfo.html', true);
            request.send();
        }

        if (surveyConfig) {
            loadBasicInfo();
        } else {
            loadSurveyConfig(loadBasicInfo, handleLoadFailure);
        }
    });
}
