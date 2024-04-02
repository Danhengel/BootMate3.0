const { Student, Project } = require("../models");
const { signToken, AuthenticationError } = require("../utils/auth");

const resolvers = {
  Query: {
    students: async () => {
      return Student.find();
    },
    
    projects: async (parent, { student, name }) => {
      const params = {};

      if (student) {
        params.student = student;
      }

      if (name) {
        params.name = name;
      }
      return Project.find(params).populate('student');
    },

    project: async (parent, { id }) => {
      return Project.findById(id).populate('student');
    },

    student: async (parent, { id, name }) => {
      const params = {};
      if (id) {
        params.id = id;
      }
      if (name) {
        params.name = name;
      }

      return Student.find(params).populate('student');
    },
  },


  Mutation: {
    addStudent: async (parent, args) => {
      const student = await Student.create(args);
      const token = signToken(student);

      return { token, student };
    },

    // Add a new project
    addProject: async (
      _,
      { name, baseLanguage, openCollab, description },
      context
    ) => {
      
      // Check if the user is authenticated
      if (!context.isAuth) {
        throw new Error("Unauthenticated!");
      }
      // Get the current student
      const studentId = context.studentId;
      
      // Create a new project
      const newProject = new Project({
        name,
        baseLanguage,
        openCollab,
        description,
        student: studentId,
      });
      
      // Save the project to the database
      const res = await newProject.save();

      // Add project to student's projects
      await Student.findByIdAndUpdate(
        studentId,
        { $push: { projects: res.id } },
        { new: true }
      );

      // Return the updated student
      return Student.findById(studentId).populate("projects");
    },

    // Remove a project
    removeProject: async (_, { projectId }, context) => {

      // Check if the user is authenticated and get the current student
      if (!context.isAuth) {
        throw new Error("Unauthenticated!");
      }
      const studentId = context.studentId;

      // Remove the project from the database
      await Project.findByIdAndRemove(projectId);

      // Remove the project from student's projects
      await Student.findByIdAndUpdate(
        studentId,
        { $pull: { projects: projectId } },
        { new: true }
      );

      // Return the updated student
      return Student.findById(studentId).populate("projects");
    },

    // Update a project
    updateProject: async (
      _,
      { projectId, openCollab, description },
      context
    ) => {

      // Check if the user is authenticated
      if (!context.isAuth) {
        throw new Error("Unauthenticated!");
      }

      // Update the project
      return Project.findByIdAndUpdate(
        projectId,
        { openCollab, description },
        { new: true }
      );
    },

    login: async (parent, { email, password }) => {
      const user = await Student.findOne({ email });

      if (!user) {
        throw AuthenticationError;
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw AuthenticationError;
      }

      const token = signToken(user);

      return { token, user };
    },

  },
};

module.exports = resolvers;
