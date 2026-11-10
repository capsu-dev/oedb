/*
 * Response shape: { basicInformation: {}, citizensCharter: {}, ... }
 *
 * Usage:
 * SurveyResponses.capture('basicInformation', form);
 * console.log(SurveyResponses.getData());
 * SurveyResponses.send('/api/surveys');
 */
(function (global) {
    var sections = {};

    document.addEventListener('survey:submit', function (event) {
        console.log('Survey response JSON:\n' + JSON.stringify(event.detail, null, 2));
    });

    function capture(sectionName, form) {
        var values = {};
        var formData = new FormData(form);

        formData.forEach(function (value, name) {
            if (Object.prototype.hasOwnProperty.call(values, name)) {
                if (!Array.isArray(values[name])) {
                    values[name] = [values[name]];
                }
                values[name].push(value);
            } else {
                values[name] = value;
            }
        });

        sections[sectionName] = values;
    }

    function getData() {
        return JSON.parse(JSON.stringify(sections));
    }

    function send(url, options) {
        var requestOptions = options || {};
        var headers = Object.assign(
            { 'Content-Type': 'application/json' },
            requestOptions.headers || {}
        );

        return fetch(url, {
            method: 'POST',
            headers: headers,
            credentials: requestOptions.credentials || 'same-origin',
            body: JSON.stringify(getData())
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Survey submission failed with HTTP status ' + response.status + '.');
            }
            return response;
        });
    }

    global.SurveyResponses = {
        capture: capture,
        getData: getData,
        reset: function () {
            sections = {};
        },
        send: send
    };
}(window));
