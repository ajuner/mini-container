import "./index.less";

export default (props) => {
  const { onClick, children } = props;
  return (
    <button className="wx-button" onClick={onClick}>
      {children}
    </button>
  );
};
