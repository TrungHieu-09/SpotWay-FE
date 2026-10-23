import { Select, type SelectProps } from 'antd'

/** Shared select configuration keeps every popup above cards and modals. */
export function AppSelect(props: SelectProps) {
  const popupClassName = [props.popupClassName, 'app-select-popup']
    .filter((value): value is string => Boolean(value))
    .join(' ')

  return (
    <Select
      {...props}
      popupClassName={popupClassName}
      getPopupContainer={props.getPopupContainer ?? (() => document.body)}
    />
  )
}
