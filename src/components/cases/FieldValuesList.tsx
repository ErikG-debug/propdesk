interface FieldValue {
  field: { key: string; label: string };
  value: string;
}

interface RequiredField {
  key: string;
  label: string;
  required: boolean;
}

export function FieldValuesList({
  fieldValues,
  requiredFields,
}: {
  fieldValues: FieldValue[];
  requiredFields: RequiredField[];
}) {
  const collectedKeys = new Set(fieldValues.map((fv) => fv.field.key));

  return (
    <dl className="divide-y divide-gray-100">
      {requiredFields.map((f) => {
        const collected = fieldValues.find((fv) => fv.field.key === f.key);
        return (
          <div key={f.key} className="flex justify-between gap-4 py-2.5">
            <dt className="text-sm text-gray-500">{f.label}</dt>
            <dd className="text-sm font-medium text-gray-900">
              {collected ? (
                collected.value
              ) : (
                <span className={`text-xs ${f.required ? "text-amber-600" : "text-gray-400"}`}>
                  {f.required ? "Saknas" : "Ej angivet"}
                </span>
              )}
            </dd>
          </div>
        );
      })}
      {/* Fält som samlats men inte finns i kategori-definitionen längre */}
      {fieldValues
        .filter((fv) => !requiredFields.some((f) => f.key === fv.field.key))
        .map((fv) => (
          <div key={fv.field.key} className="flex justify-between gap-4 py-2.5">
            <dt className="text-sm text-gray-500">{fv.field.label}</dt>
            <dd className="text-sm font-medium text-gray-900">{fv.value}</dd>
          </div>
        ))}
    </dl>
  );
}
