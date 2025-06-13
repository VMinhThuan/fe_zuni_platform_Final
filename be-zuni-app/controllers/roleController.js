const roleService = require("../services/roleService");

const createRole = async (req, res) => {
  try {
    const data = await roleService.createRole(req.body);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const data = await roleService.getRoles();
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const updateRole = async (req, res) => {
  try {
    const { roleId, ...updateData } = req.body;

    if (!roleId) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Vui lòng cung cấp ID của quyền",
        data: null,
      });
    }

    const result = await roleService.updateRole(roleId, updateData);
    return res
      .status(result.status ? 200 : result.error === 1 ? 400 : 500)
      .json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await roleService.deleteRole(id);
    return res
      .status(result.status ? 200 : result.error === 1 ? 400 : 500)
      .json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const initializeRoles = async (req, res) => {
  try {
    const result = await roleService.initializeRoles();
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

module.exports = {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
  initializeRoles,
};
